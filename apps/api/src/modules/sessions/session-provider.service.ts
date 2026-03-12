import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface BuildJoinUrlInput {
  roomId: string;
  sessionToken: string;
  displayName: string;
  bookingId: string;
}

@Injectable()
export class SessionProviderService {
  constructor(private readonly configService: ConfigService) {}

  getVideoProviderName() {
    return this.configService.get<string>('SESSION_VIDEO_PROVIDER') || 'embedded-video';
  }

  getTranscriptProviderName() {
    return this.configService.get<string>('SESSION_TRANSCRIPT_PROVIDER') || 'async-transcript';
  }

  buildRoomId(bookingId: string) {
    return `booking-${bookingId}`;
  }

  buildJoinUrl(input: BuildJoinUrlInput) {
    const template =
      this.configService.get<string>('SESSION_VIDEO_JOIN_URL_TEMPLATE') ||
      'https://video.example.test/rooms/{roomId}?session={sessionToken}&name={displayName}&booking={bookingId}';

    return template
      .replaceAll('{roomId}', encodeURIComponent(input.roomId))
      .replaceAll('{sessionToken}', encodeURIComponent(input.sessionToken))
      .replaceAll('{displayName}', encodeURIComponent(input.displayName))
      .replaceAll('{bookingId}', encodeURIComponent(input.bookingId));
  }
}
