import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
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
    return this.configService.get<string>('SESSION_TRANSCRIPT_PROVIDER') || 'faster-whisper';
  }

  buildRoomId(bookingId: string) {
    return `booking-${bookingId}`;
  }

  buildCallRoomId(callId: string) {
    return `call-${callId}`;
  }

  getLiveKitServerUrl() {
    return this.requireConfig('LIVEKIT_URL');
  }

  getLiveKitApiUrl() {
    const explicit = this.configService.get<string>('LIVEKIT_API_URL');
    if (explicit) {
      return explicit;
    }

    const serverUrl = this.getLiveKitServerUrl();
    if (serverUrl.startsWith('wss://')) {
      return `https://${serverUrl.slice('wss://'.length)}`;
    }
    if (serverUrl.startsWith('ws://')) {
      return `http://${serverUrl.slice('ws://'.length)}`;
    }
    return serverUrl;
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

  buildTranscriptObjectKey(bookingId: string, sessionToken: string) {
    return `transcripts/${bookingId}/${sessionToken}.mp3`;
  }

  async startAudioRecording(roomId: string, objectKey: string) {
    const client = this.createEgressClient();
    const fileOutput = new EncodedFileOutput({
      filepath: objectKey,
      fileType: EncodedFileType.MP3,
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey: this.requireConfig('S3_ACCESS_KEY'),
          secret: this.requireConfig('S3_SECRET_KEY'),
          bucket: this.requireConfig('S3_BUCKET'),
          endpoint: this.requireConfig('S3_ENDPOINT'),
          region: this.configService.get<string>('S3_REGION') || 'us-east-1',
          forcePathStyle: (this.configService.get<string>('S3_FORCE_PATH_STYLE') || 'true') === 'true',
        }),
      },
    });

    return client.startRoomCompositeEgress(
      roomId,
      { file: fileOutput },
      { audioOnly: true },
    );
  }

  async stopAudioRecording(egressId: string) {
    const client = this.createEgressClient();
    return client.stopEgress(egressId);
  }

  async endRoom(roomId: string) {
    const client = this.createRoomServiceClient();
    return client.deleteRoom(roomId);
  }

  async listParticipantIdentities(roomId: string) {
    const client = this.createRoomServiceClient();
    const participants = await client.listParticipants(roomId);
    return participants
      .map((participant) => participant.identity)
      .filter((identity): identity is string => Boolean(identity));
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
      this.getLiveKitApiUrl(),
      this.requireConfig('LIVEKIT_API_KEY'),
      this.requireConfig('LIVEKIT_API_SECRET'),
    );
  }

  private createEgressClient() {
    return new EgressClient(
      this.getLiveKitApiUrl(),
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
