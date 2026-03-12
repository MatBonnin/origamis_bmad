import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  WebhookEvent,
  WebhookReceiver,
} from 'livekit-server-sdk';

interface BuildParticipantTokenInput {
  roomId: string;
  identity: string;
  displayName: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SessionProviderService {
  constructor(private readonly configService: ConfigService) {}

  getVideoProviderName() {
    return this.configService.get<string>('SESSION_VIDEO_PROVIDER') || 'livekit';
  }

  getTranscriptProviderName() {
    return this.configService.get<string>('SESSION_TRANSCRIPT_PROVIDER') || 'async-transcript';
  }

  buildRoomId(bookingId: string) {
    return `booking-${bookingId}`;
  }

  getLiveKitServerUrl() {
    return this.requireConfig('LIVEKIT_URL');
  }

  async ensureRoom(roomId: string, metadata?: Record<string, unknown>) {
    const client = this.createRoomServiceClient();
    try {
      await client.createRoom({
        name: roomId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      });
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) {
        throw error;
      }
    }
  }

  async buildParticipantToken(input: BuildParticipantTokenInput) {
    const token = new AccessToken(
      this.requireConfig('LIVEKIT_API_KEY'),
      this.requireConfig('LIVEKIT_API_SECRET'),
      {
        identity: input.identity,
        name: input.displayName,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    );

    token.addGrant({
      room: input.roomId,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    return token.toJwt();
  }

  async verifyWebhook(rawBody: string, authHeader: string) {
    const receiver = new WebhookReceiver(
      this.requireConfig('LIVEKIT_API_KEY'),
      this.requireConfig('LIVEKIT_API_SECRET'),
    );
    return receiver.receive(rawBody, authHeader) as Promise<WebhookEvent>;
  }

  private createRoomServiceClient() {
    return new RoomServiceClient(
      this.requireConfig('LIVEKIT_URL'),
      this.requireConfig('LIVEKIT_API_KEY'),
      this.requireConfig('LIVEKIT_API_SECRET'),
    );
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
    return value;
  }

  private isAlreadyExistsError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const value = error as { code?: string | number; message?: string };
    return (
      value.code === 'ALREADY_EXISTS' ||
      value.code === 6 ||
      value.message?.toLowerCase().includes('already exists') === true
    );
  }
}
