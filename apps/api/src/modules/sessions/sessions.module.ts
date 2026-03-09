import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
