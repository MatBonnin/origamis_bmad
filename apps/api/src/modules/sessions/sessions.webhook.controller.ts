import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  UnauthorizedException,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SessionProviderService } from './session-provider.service';
import { SessionsService } from './sessions.service';

@ApiTags('sessions-provider')
@Controller('sessions/provider/webhooks')
export class SessionsWebhookController {
  private readonly logger = new Logger(SessionsWebhookController.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionProvider: SessionProviderService,
    private readonly configService: ConfigService,
  ) {}

  @Post('video/livekit')
  @ApiOperation({ summary: 'Recevoir un webhook LiveKit' })
  @ApiResponse({ status: 200, description: 'Webhook video traite' })
  async handleVideoWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('authorization') authorization?: string,
  ) {
    this.logger.log(
      `LiveKit webhook received: authorization=${authorization ? 'present' : 'missing'} rawBody=${request.rawBody ? 'present' : 'missing'}`,
    );

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
      providerRoomId: event.room?.name || event.egressInfo?.roomName,
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
      callSessionId?: string;
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
    @Headers('x-transcript-worker-secret') workerSecret?: string,
  ) {
    const expectedSecret = this.configService.get<string>('TRANSCRIPT_WORKER_SECRET');
    if (expectedSecret && workerSecret !== expectedSecret) {
      throw new UnauthorizedException({
        code: 'TRANSCRIPT_WORKER_UNAUTHORIZED',
        message: 'Secret worker invalide',
      });
    }

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
