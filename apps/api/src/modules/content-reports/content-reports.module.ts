import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ContentReportsController],
  providers: [ContentReportsService],
  exports: [ContentReportsService],
})
export class ContentReportsModule {}
