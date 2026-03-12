import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface TranscriptJobPayload {
  jobId: string;
  bookingId: string;
  callSessionId: string;
  sourceUrl: string;
  providerRoomId: string;
}

@Injectable()
export class TranscriptQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(TranscriptQueueService.name);
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async enqueue(job: TranscriptJobPayload) {
    const client = this.getClient();
    const queueName = this.getQueueName();
    await client.lpush(queueName, JSON.stringify(job));
    this.logger.log(`Queued transcript job ${job.jobId} for booking ${job.bookingId}`);
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  private getClient() {
    if (!this.redis) {
      const url = this.configService.get<string>('REDIS_URL');
      if (!url) {
        throw new Error('Missing required configuration: REDIS_URL');
      }
      this.redis = new Redis(url, { maxRetriesPerRequest: null });
    }
    return this.redis;
  }

  private getQueueName() {
    return this.configService.get<string>('TRANSCRIPT_QUEUE_NAME') || 'transcript_jobs';
  }
}
