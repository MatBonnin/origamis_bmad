import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';

@ApiTags('sessions-provider')
@Controller('sessions/provider/webhooks')
export class SessionsWebhookController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('video')
  @ApiOperation({ summary: 'Recevoir un webhook du provider video' })
  @ApiResponse({ status: 200, description: 'Webhook video traite' })
  async handleVideoWebhook(
    @Body()
    body: {
      bookingId?: string;
      providerRoomId?: string;
      providerEventId?: string;
      eventType?: string;
      participantUserId?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const data = await this.sessionsService.handleVideoWebhook(body);
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
}
