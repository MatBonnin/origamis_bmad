import { Module } from '@nestjs/common';
import { CommunityModule } from '../community';
import { ContentReportsModule } from '../content-reports';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [ContentReportsModule, CommunityModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
