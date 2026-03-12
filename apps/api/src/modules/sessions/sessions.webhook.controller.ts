import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionProviderService } from './session-provider.service';
import { SessionsService } from './sessions.service';

@ApiTags('sessions-provider')
@Controller('sessions/provider/webhooks')
export class SessionsWebhookController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionProvider: SessionProviderService,
  ) {}

  @Post('video/livekit')
  @ApiOperation({ summary: 'Recevoir un webhook LiveKit' })
  @ApiResponse({ status: 200, description: 'Webhook video traite' })
  async handleVideoWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('authorization') authorization?: string,
  ) {
    if (!request.rawBody || !authorization) {
      throw new BadRequestException({
        code: 'LIVEKIT_WEBHOOK_INVALID',
        message: 'Signature LiveKit manquante ou corps brut indisponible',
      });
    }

    const event = await this.sessionProvider.verifyWebhook(
      request.rawBody.toString('utf8'),
      authorization,
    );

    const data = await this.sessionsService.handleVideoWebhook({
      bookingId: this.extractBookingId(event.room?.metadata),
      providerRoomId: event.room?.name,
      providerEventId: event.id,
      eventType: event.event,
      participantUserId: event.participant?.identity,
      payload: event as unknown as Record<string, unknown>,
    });
    return { data, error: null };
  }

  @Post('transcript')
  @ApiOperation({ summary: 'Recevoir un webhook du provider de transcription' })
  @ApiResponse({ status: 200, description: 'Webhook transcript traite' })
  async handleTranscriptWebhook(
    @Body()
    body: {
      bookingId?: string;
      providerJobId?: string;
      providerRoomId?: string;
      providerEventId?: string;
      status?: 'completed' | 'failed' | 'processing';
      language?: string;
      fullText?: string;
      summaryText?: string;
      segments?: unknown[];
      payload?: Record<string, unknown>;
    },
  ) {
    const data = await this.sessionsService.handleTranscriptWebhook(body);
    return { data, error: null };
  }

  private extractBookingId(metadata?: string) {
    if (!metadata) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(metadata) as { bookingId?: string };
      return parsed.bookingId;
    } catch {
      return undefined;
    }
  }
}
