import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
