import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma';
import { NotificationsService } from '../notifications';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '');
  }

  async createCheckoutSession(studentId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { availability: { include: { mentor: true } } } } },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Rendez-vous introuvable' });
    }

    if (booking.student_id !== studentId) {
      throw new BadRequestException({ code: 'NOT_YOUR_BOOKING', message: 'Ce rendez-vous ne vous appartient pas' });
    }

    const existingPayment = await this.prisma.payments.findUnique({
      where: { booking_id: bookingId },
    });

    if (existingPayment?.status === 'succeeded') {
      throw new BadRequestException({ code: 'ALREADY_PAID', message: 'Ce rendez-vous est deja paye' });
    }

    const mentor = booking.slot.availability.mentor;
    const hourlyRate = mentor.hourly_rate ?? 5000; // cents
    const platformFeeCents = Math.round(hourlyRate * 0.15);
    const mentorPayoutCents = hourlyRate - platformFeeCents;

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Session de mentorat — ${booking.booking_date.toLocaleDateString('fr-FR')}`,
              description: `${booking.start_time} - ${booking.end_time}`,
            },
            unit_amount: hourlyRate,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/paiement/success?bookingId=${bookingId}`,
      cancel_url: `${frontendUrl}/paiement/cancel?bookingId=${bookingId}`,
      metadata: { bookingId, studentId },
    });

    await this.prisma.payments.upsert({
      where: { booking_id: bookingId },
      create: {
        booking_id: bookingId,
        stripe_payment_intent: session.payment_intent as string | null,
        amount_cents: hourlyRate,
        platform_fee_cents: platformFeeCents,
        mentor_payout_cents: mentorPayoutCents,
        status: 'pending',
      },
      update: {
        stripe_payment_intent: session.payment_intent as string | null,
        status: 'pending',
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException({ code: 'INVALID_WEBHOOK', message: 'Signature invalide' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) return { received: true };

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      await this.prisma.payments.update({
        where: { booking_id: bookingId },
        data: {
          status: 'succeeded',
          stripe_payment_intent: paymentIntentId,
        },
      });

      await this.prisma.bookings.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
      });

      const booking = await this.prisma.bookings.findUnique({
        where: { id: bookingId },
      });

      if (booking) {
        await this.notifications.emitNotification({
          userId: booking.student_id,
          category: 'rdv',
          channel: 'in_app',
          title: 'Paiement confirme',
          message: 'Votre paiement a ete accepte. La session est confirmee.',
          payload: { bookingId },
        });

        await this.notifications.emitNotification({
          userId: booking.mentor_id,
          category: 'rdv',
          channel: 'in_app',
          title: 'Session payee',
          message: 'Un etudiant a paye sa session avec vous.',
          payload: { bookingId },
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payments.updateMany({
        where: { stripe_payment_intent: intent.id },
        data: { status: 'failed' },
      });
    }

    return { received: true };
  }

  async getPaymentHistory(userId: string, role: 'student' | 'mentor') {
    const bookingWhere =
      role === 'student' ? { student_id: userId } : { mentor_id: userId };

    const payments = await this.prisma.payments.findMany({
      where: { booking: bookingWhere },
      include: {
        booking: {
          select: {
            id: true,
            booking_date: true,
            start_time: true,
            end_time: true,
            student_id: true,
            mentor_id: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return payments;
  }

  async createSubscription(userId: string) {
    const priceId = this.config.get<string>('STRIPE_PREMIUM_PRICE_ID') ?? '';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    let subscription = await this.prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const user = await this.prisma.users.findUnique({ where: { id: userId } });
      const customer = await this.stripe.customers.create({
        email: user?.email,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${frontendUrl}/profil?tab=facturation&upgraded=1`,
      cancel_url: `${frontendUrl}/profil?tab=facturation`,
      metadata: { userId },
    });

    if (!subscription) {
      await this.prisma.subscriptions.create({
        data: {
          user_id: userId,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active',
        },
      });
    } else {
      await this.prisma.subscriptions.update({
        where: { user_id: userId },
        data: { stripe_customer_id: customerId },
      });
    }

    return { checkoutUrl: session.url };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription?.stripe_subscription_id) {
      throw new NotFoundException({ code: 'NO_SUBSCRIPTION', message: 'Aucun abonnement actif' });
    }

    await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    await this.prisma.subscriptions.update({
      where: { user_id: userId },
      data: { status: 'canceled', plan: 'free' },
    });

    return { canceled: true };
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: { invoices: { orderBy: { created_at: 'desc' }, take: 10 } },
    });

    if (!subscription) {
      return { plan: 'free', status: 'active', invoices: [] };
    }

    return subscription;
  }
}
