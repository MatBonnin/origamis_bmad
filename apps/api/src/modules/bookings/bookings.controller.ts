import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import {
  BookingsService,
  CreateBookingDto,
  RescheduleBookingDto,
} from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Creer une reservation' })
  @ApiResponse({ status: 201, description: 'Reservation creee' })
  async createBooking(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBookingDto,
  ) {
    const data = await this.bookingsService.createBooking(user.id, dto);
    return { data, error: null };
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes reservations' })
  @ApiResponse({ status: 200, description: 'Liste des reservations' })
  async listMyBookings(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('role') role?: 'student' | 'mentor',
  ) {
    const data = await this.bookingsService.listMyBookings(user.id, {
      status,
      role,
    });
    return { data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Details d une reservation' })
  @ApiResponse({ status: 200, description: 'Details du rendez-vous' })
  async getBooking(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    const data = await this.bookingsService.getBooking(user.id, bookingId);
    return { data, error: null };
  }

  @Get(':id/session-link')
  @ApiOperation({ summary: 'Obtenir le lien de session visio' })
  @ApiResponse({ status: 200, description: 'Lien de session' })
  async getSessionLink(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    const data = await this.bookingsService.getSessionLink(user.id, bookingId);
    return { data, error: null };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une reservation' })
  @ApiResponse({ status: 200, description: 'Reservation annulee' })
  async cancelBooking(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
    @Body() body: { reason?: string },
  ) {
    const data = await this.bookingsService.cancelBooking(
      user.id,
      bookingId,
      body.reason,
    );
    return { data, error: null };
  }

  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Reporter une reservation' })
  @ApiResponse({ status: 200, description: 'Reservation reportee' })
  async rescheduleBooking(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    const data = await this.bookingsService.rescheduleBooking(
      user.id,
      bookingId,
      dto,
    );
    return { data, error: null };
  }
}
