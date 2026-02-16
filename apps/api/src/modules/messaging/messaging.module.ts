import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications';
import { PrismaModule } from '../prisma';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
