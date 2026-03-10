import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('bookings/:bookingId/checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Creer une session de paiement Stripe pour un booking' })
  async createCheckout(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.paymentsService.createCheckoutSession(user.id, bookingId);
    return { data, error: null };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook Stripe (raw body requis)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('>>> CONTROLLER WEBHOOK APPELE');
    console.log('>>> rawBody existe?', !!req.rawBody);
    console.log('>>> signature:', signature?.substring(0, 30) + '...');
    const raw = req.rawBody;
    if (!raw) {
      console.log('>>> ERREUR: rawBody est null/undefined!');
      return { received: false };
    }
    const data = await this.paymentsService.handleWebhook(raw, signature);
    return data;
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Historique des paiements' })
  async getHistory(@CurrentUser() user: { id: string; roles?: string[] }) {
    const role = (user.roles ?? []).includes('mentor') ? 'mentor' : 'student';
    const data = await this.paymentsService.getPaymentHistory(user.id, role);
    return { data, error: null };
  }

  @Post('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Creer un abonnement premium' })
  async createSubscription(@CurrentUser() user: { id: string }) {
    const data = await this.paymentsService.createSubscription(user.id);
    return { data, error: null };
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Annuler l abonnement premium' })
  async cancelSubscription(@CurrentUser() user: { id: string }) {
    const data = await this.paymentsService.cancelSubscription(user.id);
    return { data, error: null };
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtenir le plan et statut d abonnement courant' })
  async getSubscription(@CurrentUser() user: { id: string }) {
    const data = await this.paymentsService.getSubscription(user.id);
    return { data, error: null };
  }
}
