import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { SessionsController } from './sessions.controller';
import { SessionProviderService } from './session-provider.service';
import { SessionsGateway } from './sessions.gateway';
import { SessionsService } from './sessions.service';
import { SessionsWebhookController } from './sessions.webhook.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SessionsController, SessionsWebhookController],
  providers: [SessionsService, SessionProviderService, SessionsGateway],
  exports: [SessionsService, SessionProviderService],
})
export class SessionsModule {}
