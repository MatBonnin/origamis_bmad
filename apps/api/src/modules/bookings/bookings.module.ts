import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { SessionsModule } from '../sessions';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule, NotificationsModule, SessionsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
