import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma';
import {
  NotificationsService,
  EmitNotificationInput,
} from '../notifications/notifications.service';

export interface CreateBookingDto {
  mentorId: string;
  slotId: string;
  bookingDate: string; // ISO date string YYYY-MM-DD
  notes?: string;
}

export interface RescheduleBookingDto {
  newSlotId: string;
  newBookingDate: string; // ISO date string YYYY-MM-DD
  reason?: string;
}

/** Minimum hours before a booking that cancel/reschedule is allowed */
const MIN_NOTICE_HOURS = 4;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createBooking(studentId: string, dto: CreateBookingDto) {
    // 1. Validate the slot exists and is published
    const slot = await this.prisma.mentor_availability_slots.findUnique({
      where: { id: dto.slotId },
      include: { availability: true },
    });

    if (!slot || slot.status !== 'published') {
      throw new NotFoundException({
        code: 'SLOT_NOT_FOUND',
        message: 'Creneau introuvable ou indisponible',
      });
    }

    // 2. Check mentor availability
    if (!slot.availability.is_available) {
      throw new BadRequestException({
        code: 'MENTOR_UNAVAILABLE',
        message: "Ce mentor n'est pas disponible actuellement",
      });
    }

    // 3. Verify mentor matches
    if (slot.availability.mentor_user_id !== dto.mentorId) {
      throw new BadRequestException({
        code: 'SLOT_MENTOR_MISMATCH',
        message: "Ce creneau n'appartient pas au mentor selectionne",
      });
    }

    // 4. Cannot book yourself
    if (studentId === dto.mentorId) {
      throw new BadRequestException({
        code: 'SELF_BOOKING',
        message: 'Vous ne pouvez pas reserver un creneau avec vous-meme',
      });
    }

    // 5. Validate booking date
    const bookingDate = new Date(dto.bookingDate);
    if (isNaN(bookingDate.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date de reservation invalide',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'La date de reservation ne peut pas etre dans le passe',
      });
    }

    // 6. Validate day of week matches the slot
    if (bookingDate.getDay() !== slot.day_of_week) {
      throw new BadRequestException({
        code: 'DAY_MISMATCH',
        message: 'La date ne correspond pas au jour du creneau',
      });
    }

    // 7. Check for conflicts (same slot + same date, not cancelled)
    const existingBooking = await this.prisma.bookings.findFirst({
      where: {
        slot_id: dto.slotId,
        booking_date: bookingDate,
        status: { notIn: ['cancelled'] },
      },
    });

    if (existingBooking) {
      throw new ConflictException({
        code: 'SLOT_ALREADY_BOOKED',
        message: 'Ce creneau est deja reserve pour cette date',
      });
    }

    await this.assertExternalCalendarAvailability(
      dto.mentorId,
      bookingDate,
      slot.start_time,
      slot.end_time,
    );

    // 8. Create booking (payment-gated flow: pending until payment succeeds)
    const booking = await this.prisma.bookings.create({
      data: {
        student_id: studentId,
        mentor_id: dto.mentorId,
        slot_id: dto.slotId,
        booking_date: bookingDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'pending',
        notes: dto.notes ?? null,
      },
    });

    // 9. Notify mentor
    await this.emitBookingNotification(
      dto.mentorId,
      'Nouvelle reservation en attente',
      `Un etudiant a reserve un creneau le ${this.formatDate(bookingDate)} de ${slot.start_time} a ${slot.end_time} (en attente de paiement)`,
      { bookingId: booking.id },
    );

    // 10. Notify student (confirmation)
    await this.emitBookingNotification(
      studentId,
      'Reservation en attente de paiement',
      `Finalisez le paiement pour confirmer votre rendez-vous du ${this.formatDate(bookingDate)} de ${slot.start_time} a ${slot.end_time}`,
      { bookingId: booking.id },
    );

    const mapped = this.mapBooking(booking);
    return {
      booking: mapped,
      bookingId: mapped.bookingId,
      paymentRequired: true,
    };
  }

  async getBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    return {
      booking: {
        ...this.mapBooking(booking),
        student: {
          id: booking.student.id,
          firstName: booking.student.first_name,
          lastName: booking.student.last_name,
        },
        mentor: {
          id: booking.mentor.id,
          firstName: booking.mentor.first_name,
          lastName: booking.mentor.last_name,
        },
      },
    };
  }

  async listMyBookings(
    userId: string,
    filters?: { status?: string; role?: 'student' | 'mentor' },
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.role === 'student') {
      where.student_id = userId;
    } else if (filters?.role === 'mentor') {
      where.mentor_id = userId;
    } else {
      where.OR = [{ student_id: userId }, { mentor_id: userId }];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const bookings = await this.prisma.bookings.findMany({
      where,
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { booking_date: 'asc' },
    });

    return {
      bookings: bookings.map((b) => ({
        ...this.mapBooking(b),
        student: {
          id: b.student.id,
          firstName: b.student.first_name,
          lastName: b.student.last_name,
        },
        mentor: {
          id: b.mentor.id,
          firstName: b.mentor.first_name,
          lastName: b.mentor.last_name,
        },
      })),
    };
  }

  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException({
        code: 'ALREADY_CANCELLED',
        message: 'Ce rendez-vous est deja annule',
      });
    }

    if (booking.status === 'completed') {
      throw new BadRequestException({
        code: 'ALREADY_COMPLETED',
        message: 'Un rendez-vous termine ne peut pas etre annule',
      });
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new BadRequestException({
        code: 'CANNOT_CANCEL_STATUS',
        message: "Ce statut de rendez-vous ne permet pas l'annulation",
      });
    }

    this.checkNoticePolicy(booking.booking_date, booking.start_time);

    const updated = await this.prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelled_by: userId,
        cancellation_reason: reason ?? null,
      },
    });

    // Notify the other participant
    const otherUserId =
      userId === booking.student_id ? booking.mentor_id : booking.student_id;

    await this.emitBookingNotification(
      otherUserId,
      'Rendez-vous annule',
      `Le rendez-vous du ${this.formatDate(booking.booking_date)} de ${booking.start_time} a ${booking.end_time} a ete annule`,
      { bookingId: booking.id },
    );

    return { booking: this.mapBooking(updated) };
  }

  async rescheduleBooking(
    userId: string,
    bookingId: string,
    dto: RescheduleBookingDto,
  ) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new BadRequestException({
        code: 'CANNOT_RESCHEDULE',
        message:
          'Seuls les rendez-vous confirmes ou en attente peuvent etre reportes',
      });
    }

    this.checkNoticePolicy(booking.booking_date, booking.start_time);

    // Validate new slot
    const newSlot = await this.prisma.mentor_availability_slots.findUnique({
      where: { id: dto.newSlotId },
      include: { availability: true },
    });

    if (!newSlot || newSlot.status !== 'published') {
      throw new NotFoundException({
        code: 'SLOT_NOT_FOUND',
        message: 'Nouveau creneau introuvable ou indisponible',
      });
    }

    // Validate new date
    const newBookingDate = new Date(dto.newBookingDate);
    if (isNaN(newBookingDate.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date de reservation invalide',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newBookingDate < today) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'La nouvelle date ne peut pas etre dans le passe',
      });
    }

    if (newBookingDate.getDay() !== newSlot.day_of_week) {
      throw new BadRequestException({
        code: 'DAY_MISMATCH',
        message: 'La date ne correspond pas au jour du creneau',
      });
    }

    // Check conflict on new slot+date
    const existingBooking = await this.prisma.bookings.findFirst({
      where: {
        slot_id: dto.newSlotId,
        booking_date: newBookingDate,
        status: { notIn: ['cancelled'] },
        id: { not: bookingId },
      },
    });

    if (existingBooking) {
      throw new ConflictException({
        code: 'SLOT_ALREADY_BOOKED',
        message: 'Le nouveau creneau est deja reserve pour cette date',
      });
    }

    await this.assertExternalCalendarAvailability(
      booking.mentor_id,
      newBookingDate,
      newSlot.start_time,
      newSlot.end_time,
    );

    // Update booking with new slot and date
    const updated = await this.prisma.bookings.update({
      where: { id: bookingId },
      data: {
        slot_id: dto.newSlotId,
        booking_date: newBookingDate,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        cancellation_reason: dto.reason ?? null,
      },
    });

    // Notify the other participant
    const otherUserId =
      userId === booking.student_id ? booking.mentor_id : booking.student_id;

    await this.emitBookingNotification(
      otherUserId,
      'Rendez-vous reporte',
      `Le rendez-vous a ete reporte au ${this.formatDate(newBookingDate)} de ${newSlot.start_time} a ${newSlot.end_time}`,
      { bookingId: booking.id },
    );

    return { booking: this.mapBooking(updated) };
  }

  async getSessionLink(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: { session: true },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: 'Le rendez-vous doit etre confirme pour acceder a la session',
      });
    }

    // Check if session already exists and is still valid
    if (booking.session && booking.session.expires_at > new Date()) {
      return {
        sessionUrl: booking.session.session_url,
        token: booking.session.session_token,
        expiresAt: booking.session.expires_at.toISOString(),
      };
    }

    // Generate new session link
    const token = randomUUID();
    const sessionUrl = `/session/${token}`;

    // Expires 30 min after booking end time on booking date
    const [endH, endM] = booking.end_time.split(':').map(Number);
    const expiresAt = new Date(booking.booking_date);
    expiresAt.setHours(endH, endM + 30, 0, 0);

    if (booking.session) {
      // Update expired session
      await this.prisma.booking_sessions.update({
        where: { id: booking.session.id },
        data: {
          session_token: token,
          session_url: sessionUrl,
          expires_at: expiresAt,
        },
      });
    } else {
      // Create new session
      await this.prisma.booking_sessions.create({
        data: {
          booking_id: bookingId,
          session_token: token,
          session_url: sessionUrl,
          expires_at: expiresAt,
        },
      });
    }

    return {
      sessionUrl,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private checkNoticePolicy(bookingDate: Date, startTime: string) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const bookingStart = new Date(bookingDate);
    bookingStart.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilBooking =
      (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < MIN_NOTICE_HOURS) {
      throw new BadRequestException({
        code: 'NOTICE_PERIOD_VIOLATION',
        message: `Impossible de modifier un rendez-vous moins de ${MIN_NOTICE_HOURS}h a l'avance`,
      });
    }
  }

  private async emitBookingNotification(
    userId: string,
    title: string,
    message: string,
    payload: Record<string, unknown>,
  ) {
    const input: EmitNotificationInput = {
      userId,
      channel: 'in_app',
      category: 'rdv',
      title,
      message,
      payload,
    };

    try {
      await this.notifications.emitNotification(input);
    } catch {
      // Non-blocking: notification failure should not break booking
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private mapBooking(booking: {
    id: string;
    student_id: string;
    mentor_id: string;
    slot_id: string;
    booking_date: Date;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      bookingId: booking.id,
      studentId: booking.student_id,
      mentorId: booking.mentor_id,
      slotId: booking.slot_id,
      bookingDate: booking.booking_date.toISOString().split('T')[0],
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      notes: booking.notes,
      cancelledBy: booking.cancelled_by,
      cancellationReason: booking.cancellation_reason,
      createdAt: booking.created_at.toISOString(),
      updatedAt: booking.updated_at.toISOString(),
    };
  }

  private async assertExternalCalendarAvailability(
    mentorId: string,
    bookingDate: Date,
    startTime: string,
    endTime: string,
  ) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startAt = new Date(bookingDate);
    startAt.setHours(startHour, startMinute, 0, 0);
    const endAt = new Date(bookingDate);
    endAt.setHours(endHour, endMinute, 0, 0);

    if (!this.prisma.mentor_calendar_busy_slots?.findFirst) {
      return;
    }
    const conflict = await this.prisma.mentor_calendar_busy_slots.findFirst({
      where: {
        mentor_id: mentorId,
        start_at: { lt: endAt },
        end_at: { gt: startAt },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException({
        code: 'EXTERNAL_CALENDAR_CONFLICT',
        message:
          'Ce creneau est deja occupe dans le calendrier externe du mentor',
      });
    }
  }
}
