import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma';
import {
  NotificationsService,
  EmitNotificationInput,
} from '../notifications/notifications.service';

export interface CreateBookingDto {
  mentorId: string;
  slotId: string;
  bookingDate: string; // ISO date string YYYY-MM-DD
  notes?: string;
}

// New DTO for dynamic slot booking (V2)
export interface CreateBookingV2Dto {
  mentorId: string;
  date: string;       // ISO date string YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  notes?: string;
}

export interface RescheduleBookingDto {
  newSlotId: string;
  newBookingDate: string; // ISO date string YYYY-MM-DD
  reason?: string;
}

/** Minimum hours before a booking that cancel/reschedule is allowed */
const MIN_NOTICE_HOURS = 4;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createBooking(studentId: string, dto: CreateBookingDto) {
    // 1. Validate the slot exists and is published
    const slot = await this.prisma.mentor_availability_slots.findUnique({
      where: { id: dto.slotId },
      include: { availability: true },
    });

    if (!slot || slot.status !== 'published') {
      throw new NotFoundException({
        code: 'SLOT_NOT_FOUND',
        message: 'Creneau introuvable ou indisponible',
      });
    }

    // 2. Check mentor availability
    if (!slot.availability.is_available) {
      throw new BadRequestException({
        code: 'MENTOR_UNAVAILABLE',
        message: "Ce mentor n'est pas disponible actuellement",
      });
    }

    // 3. Verify mentor matches
    if (slot.availability.mentor_user_id !== dto.mentorId) {
      throw new BadRequestException({
        code: 'SLOT_MENTOR_MISMATCH',
        message: "Ce creneau n'appartient pas au mentor selectionne",
      });
    }

    // 4. Cannot book yourself
    if (studentId === dto.mentorId) {
      throw new BadRequestException({
        code: 'SELF_BOOKING',
        message: 'Vous ne pouvez pas reserver un creneau avec vous-meme',
      });
    }

    // 5. Validate booking date
    const bookingDate = this.parseIsoDateOnly(dto.bookingDate);
    if (!bookingDate) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date de reservation invalide',
      });
    }

    const today = this.getStartOfTodayUtc();
    if (bookingDate < today) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'La date de reservation ne peut pas etre dans le passe',
      });
    }

    // 6. Validate day of week matches the slot
    if (bookingDate.getUTCDay() !== slot.day_of_week) {
      throw new BadRequestException({
        code: 'DAY_MISMATCH',
        message: 'La date ne correspond pas au jour du creneau',
      });
    }

    await this.assertExternalCalendarAvailability(
      dto.mentorId,
      bookingDate,
      slot.start_time,
      slot.end_time,
    );

    const booking = await this.prisma.$transaction(
      async (tx) => {
        // Check for conflicts (same slot + same date, not cancelled)
        const existingBooking = await tx.bookings.findFirst({
          where: {
            slot_id: dto.slotId,
            booking_date: bookingDate,
            status: { notIn: ['cancelled'] },
          },
        });

        if (existingBooking) {
          throw new ConflictException({
            code: 'SLOT_ALREADY_BOOKED',
            message: 'Ce creneau est deja reserve pour cette date',
          });
        }

        // Create booking (payment-gated flow: pending until payment succeeds)
        return tx.bookings.create({
          data: {
            student_id: studentId,
            mentor_id: dto.mentorId,
            slot_id: dto.slotId,
            booking_date: bookingDate,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: 'pending',
            notes: dto.notes ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // 9. Notify mentor
    await this.emitBookingNotification(
      dto.mentorId,
      'Nouvelle reservation en attente',
      `Un etudiant a reserve un creneau le ${this.formatDate(bookingDate)} de ${slot.start_time} a ${slot.end_time} (en attente de paiement)`,
      { bookingId: booking.id },
    );

    // 10. Notify student (confirmation)
    await this.emitBookingNotification(
      studentId,
      'Reservation en attente de paiement',
      `Finalisez le paiement pour confirmer votre rendez-vous du ${this.formatDate(bookingDate)} de ${slot.start_time} a ${slot.end_time}`,
      { bookingId: booking.id },
    );

    const mapped = this.mapBooking(booking);
    return {
      booking: mapped,
      bookingId: mapped.bookingId,
      paymentRequired: true,
    };
  }

  /**
   * V2 Booking - Uses dynamic slot calculation instead of fixed slots
   */
  async createBookingV2(studentId: string, dto: CreateBookingV2Dto) {
    // 1. Validate time format
    const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!TIME_REGEX.test(dto.startTime) || !TIME_REGEX.test(dto.endTime)) {
      throw new BadRequestException({
        code: 'INVALID_TIME_FORMAT',
        message: "Le format d'heure doit etre HH:mm",
      });
    }

    // 2. Validate date
    const bookingDate = this.parseIsoDateOnly(dto.date);
    if (!bookingDate) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date de reservation invalide',
      });
    }

    // 3. Cannot book yourself
    if (studentId === dto.mentorId) {
      throw new BadRequestException({
        code: 'SELF_BOOKING',
        message: 'Vous ne pouvez pas reserver un creneau avec vous-meme',
      });
    }

    // 4. Get mentor availability settings
    const availability = await this.prisma.mentor_availability.findUnique({
      where: { mentor_user_id: dto.mentorId },
      include: {
        weekly_schedules: true,
        date_overrides: true,
      },
    });

    if (!availability) {
      throw new NotFoundException({
        code: 'MENTOR_NOT_FOUND',
        message: 'Mentor introuvable',
      });
    }

    if (!availability.is_available) {
      throw new BadRequestException({
        code: 'MENTOR_UNAVAILABLE',
        message: "Ce mentor n'est pas disponible actuellement",
      });
    }

    // 5. Check min notice
    const now = new Date();
    const slotDateTime = new Date(`${dto.date}T${dto.startTime}:00.000Z`);
    const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSlot < availability.min_notice_hours) {
      throw new BadRequestException({
        code: 'MIN_NOTICE_VIOLATION',
        message: `Le preavis minimum est de ${availability.min_notice_hours} heures`,
      });
    }

    // 6. Check max days ahead
    const today = this.getStartOfTodayUtc();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + availability.max_days_ahead);

    if (bookingDate > maxDate) {
      throw new BadRequestException({
        code: 'TOO_FAR_AHEAD',
        message: `Les reservations sont limitees a ${availability.max_days_ahead} jours a l'avance`,
      });
    }

    // 7. Validate session duration matches
    const requestedDuration = this.calculateDurationMinutes(dto.startTime, dto.endTime);
    if (requestedDuration !== availability.session_duration) {
      throw new BadRequestException({
        code: 'INVALID_DURATION',
        message: `La duree de session doit etre de ${availability.session_duration} minutes`,
      });
    }

    // 8. Check date override
    const dateStr = dto.date;
    const override = availability.date_overrides.find(
      (o) => o.date.toISOString().split('T')[0] === dateStr,
    );

    if (override && override.override_type === 'unavailable') {
      throw new BadRequestException({
        code: 'DATE_UNAVAILABLE',
        message: 'Le mentor n\'est pas disponible ce jour-la',
      });
    }

    // 9. Validate slot fits within schedule
    const dayOfWeek = bookingDate.getUTCDay();
    let timeWindows: Array<{ start: string; end: string }>;

    if (override && override.override_type === 'custom_hours') {
      timeWindows = override.time_windows as Array<{ start: string; end: string }>;
    } else {
      const weeklySchedule = availability.weekly_schedules.find(
        (ws) => ws.day_of_week === dayOfWeek,
      );

      if (!weeklySchedule || !weeklySchedule.is_available) {
        throw new BadRequestException({
          code: 'DAY_NOT_AVAILABLE',
          message: 'Le mentor n\'est pas disponible ce jour de la semaine',
        });
      }

      timeWindows = weeklySchedule.time_windows as Array<{ start: string; end: string }>;
    }

    // Check if requested slot fits within any time window (including buffers)
    const slotFits = timeWindows.some((window) => {
      const windowStartMinutes = this.timeToMinutes(window.start);
      const windowEndMinutes = this.timeToMinutes(window.end);
      const slotStartMinutes = this.timeToMinutes(dto.startTime);
      const slotEndMinutes = this.timeToMinutes(dto.endTime);

      // Account for buffers
      const effectiveSlotStart = slotStartMinutes - availability.buffer_before;
      const effectiveSlotEnd = slotEndMinutes + availability.buffer_after;

      return effectiveSlotStart >= windowStartMinutes && effectiveSlotEnd <= windowEndMinutes;
    });

    if (!slotFits) {
      throw new BadRequestException({
        code: 'SLOT_OUTSIDE_SCHEDULE',
        message: 'Ce creneau ne correspond pas aux disponibilites du mentor',
      });
    }

    // 10. Check external calendar
    await this.assertExternalCalendarAvailability(
      dto.mentorId,
      bookingDate,
      dto.startTime,
      dto.endTime,
    );

    // 11. Check daily/weekly limits
    const existingBookingsToday = await this.prisma.bookings.count({
      where: {
        mentor_id: dto.mentorId,
        booking_date: bookingDate,
        status: { notIn: ['cancelled'] },
      },
    });

    if (availability.daily_limit && existingBookingsToday >= availability.daily_limit) {
      throw new BadRequestException({
        code: 'DAILY_LIMIT_REACHED',
        message: 'Le mentor a atteint sa limite de sessions pour ce jour',
      });
    }

    const weekStart = this.getWeekStart(bookingDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const existingBookingsThisWeek = await this.prisma.bookings.count({
      where: {
        mentor_id: dto.mentorId,
        booking_date: { gte: weekStart, lt: weekEnd },
        status: { notIn: ['cancelled'] },
      },
    });

    if (availability.weekly_limit && existingBookingsThisWeek >= availability.weekly_limit) {
      throw new BadRequestException({
        code: 'WEEKLY_LIMIT_REACHED',
        message: 'Le mentor a atteint sa limite de sessions pour cette semaine',
      });
    }

    // 12. Create or find a slot for backward compatibility
    let slot = await this.prisma.mentor_availability_slots.findFirst({
      where: {
        availability_id: availability.id,
        day_of_week: dayOfWeek,
        start_time: dto.startTime,
        end_time: dto.endTime,
      },
    });

    if (!slot) {
      // Create a dynamic slot for this specific booking
      slot = await this.prisma.mentor_availability_slots.create({
        data: {
          availability_id: availability.id,
          day_of_week: dayOfWeek,
          start_time: dto.startTime,
          end_time: dto.endTime,
          is_recurring: false,
          status: 'published',
        },
      });
    }

    // 13. Create the booking with transaction
    const booking = await this.prisma.$transaction(
      async (tx) => {
        // Check for time conflicts
        const existingBooking = await tx.bookings.findFirst({
          where: {
            mentor_id: dto.mentorId,
            booking_date: bookingDate,
            status: { notIn: ['cancelled'] },
            OR: [
              {
                start_time: { lt: dto.endTime },
                end_time: { gt: dto.startTime },
              },
            ],
          },
        });

        if (existingBooking) {
          throw new ConflictException({
            code: 'TIME_CONFLICT',
            message: 'Ce creneau horaire est deja reserve',
          });
        }

        return tx.bookings.create({
          data: {
            student_id: studentId,
            mentor_id: dto.mentorId,
            slot_id: slot!.id,
            booking_date: bookingDate,
            start_time: dto.startTime,
            end_time: dto.endTime,
            status: 'pending',
            notes: dto.notes ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // 14. Notify mentor
    await this.emitBookingNotification(
      dto.mentorId,
      'Nouvelle reservation en attente',
      `Un etudiant a reserve un creneau le ${this.formatDate(bookingDate)} de ${dto.startTime} a ${dto.endTime} (en attente de paiement)`,
      { bookingId: booking.id },
    );

    // 15. Notify student
    await this.emitBookingNotification(
      studentId,
      'Reservation en attente de paiement',
      `Finalisez le paiement pour confirmer votre rendez-vous du ${this.formatDate(bookingDate)} de ${dto.startTime} a ${dto.endTime}`,
      { bookingId: booking.id },
    );

    const mapped = this.mapBooking(booking);
    return {
      booking: mapped,
      bookingId: mapped.bookingId,
      paymentRequired: true,
    };
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  }

  async getBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        payment: { select: { amount_cents: true } },
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            mentor_profile: { select: { hourly_rate: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    return {
      booking: {
        ...this.mapBooking(booking),
        priceCents: this.resolveBookingPriceCents(booking),
        student: {
          id: booking.student.id,
          firstName: booking.student.first_name,
          lastName: booking.student.last_name,
        },
        mentor: {
          id: booking.mentor.id,
          firstName: booking.mentor.first_name,
          lastName: booking.mentor.last_name,
        },
      },
    };
  }

  async listMyBookings(
    userId: string,
    filters?: { status?: string; role?: 'student' | 'mentor' },
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.role === 'student') {
      where.student_id = userId;
    } else if (filters?.role === 'mentor') {
      where.mentor_id = userId;
    } else {
      where.OR = [{ student_id: userId }, { mentor_id: userId }];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const bookings = await this.prisma.bookings.findMany({
      where,
      include: {
        payment: { select: { amount_cents: true } },
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            mentor_profile: { select: { hourly_rate: true } },
          },
        },
      },
      orderBy: { booking_date: 'asc' },
    });

    return {
      bookings: bookings.map((b) => ({
        ...this.mapBooking(b),
        priceCents: this.resolveBookingPriceCents(b),
        student: {
          id: b.student.id,
          firstName: b.student.first_name,
          lastName: b.student.last_name,
        },
        mentor: {
          id: b.mentor.id,
          firstName: b.mentor.first_name,
          lastName: b.mentor.last_name,
        },
      })),
    };
  }

  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException({
        code: 'ALREADY_CANCELLED',
        message: 'Ce rendez-vous est deja annule',
      });
    }

    if (booking.status === 'completed') {
      throw new BadRequestException({
        code: 'ALREADY_COMPLETED',
        message: 'Un rendez-vous termine ne peut pas etre annule',
      });
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new BadRequestException({
        code: 'CANNOT_CANCEL_STATUS',
        message: "Ce statut de rendez-vous ne permet pas l'annulation",
      });
    }

    this.checkNoticePolicy(booking.booking_date, booking.start_time);

    const updated = await this.prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelled_by: userId,
        cancellation_reason: reason ?? null,
      },
    });

    // Notify the other participant
    const otherUserId =
      userId === booking.student_id ? booking.mentor_id : booking.student_id;

    await this.emitBookingNotification(
      otherUserId,
      'Rendez-vous annule',
      `Le rendez-vous du ${this.formatDate(booking.booking_date)} de ${booking.start_time} a ${booking.end_time} a ete annule`,
      { bookingId: booking.id },
    );

    return { booking: this.mapBooking(updated) };
  }

  async rescheduleBooking(
    userId: string,
    bookingId: string,
    dto: RescheduleBookingDto,
  ) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new BadRequestException({
        code: 'CANNOT_RESCHEDULE',
        message:
          'Seuls les rendez-vous confirmes ou en attente peuvent etre reportes',
      });
    }

    this.checkNoticePolicy(booking.booking_date, booking.start_time);

    // Validate new slot
    const newSlot = await this.prisma.mentor_availability_slots.findUnique({
      where: { id: dto.newSlotId },
      include: { availability: true },
    });

    if (!newSlot || newSlot.status !== 'published') {
      throw new NotFoundException({
        code: 'SLOT_NOT_FOUND',
        message: 'Nouveau creneau introuvable ou indisponible',
      });
    }

    // Validate new date
    const newBookingDate = this.parseIsoDateOnly(dto.newBookingDate);
    if (!newBookingDate) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date de reservation invalide',
      });
    }

    const today = this.getStartOfTodayUtc();
    if (newBookingDate < today) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'La nouvelle date ne peut pas etre dans le passe',
      });
    }

    if (newBookingDate.getUTCDay() !== newSlot.day_of_week) {
      throw new BadRequestException({
        code: 'DAY_MISMATCH',
        message: 'La date ne correspond pas au jour du creneau',
      });
    }

    if (newSlot.availability.mentor_user_id !== booking.mentor_id) {
      throw new BadRequestException({
        code: 'SLOT_MENTOR_MISMATCH',
        message: "Ce creneau n'appartient pas au mentor du rendez-vous",
      });
    }

    if (!newSlot.availability.is_available) {
      throw new BadRequestException({
        code: 'MENTOR_UNAVAILABLE',
        message: "Ce mentor n'est pas disponible actuellement",
      });
    }

    await this.assertExternalCalendarAvailability(
      booking.mentor_id,
      newBookingDate,
      newSlot.start_time,
      newSlot.end_time,
    );

    const updated = await this.prisma.$transaction(
      async (tx) => {
        // Check conflict on new slot+date
        const existingBooking = await tx.bookings.findFirst({
          where: {
            slot_id: dto.newSlotId,
            booking_date: newBookingDate,
            status: { notIn: ['cancelled'] },
            id: { not: bookingId },
          },
        });

        if (existingBooking) {
          throw new ConflictException({
            code: 'SLOT_ALREADY_BOOKED',
            message: 'Le nouveau creneau est deja reserve pour cette date',
          });
        }

        // Update booking with new slot and date
        return tx.bookings.update({
          where: { id: bookingId },
          data: {
            slot_id: dto.newSlotId,
            booking_date: newBookingDate,
            start_time: newSlot.start_time,
            end_time: newSlot.end_time,
            cancellation_reason: dto.reason ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // Notify the other participant
    const otherUserId =
      userId === booking.student_id ? booking.mentor_id : booking.student_id;

    await this.emitBookingNotification(
      otherUserId,
      'Rendez-vous reporte',
      `Le rendez-vous a ete reporte au ${this.formatDate(newBookingDate)} de ${newSlot.start_time} a ${newSlot.end_time}`,
      { bookingId: booking.id },
    );

    return { booking: this.mapBooking(updated) };
  }

  async getSessionLink(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: { session: true },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Rendez-vous introuvable',
      });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de ce rendez-vous",
      });
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: 'Le rendez-vous doit etre confirme pour acceder a la session',
      });
    }

    // Check if session already exists and is still valid
    if (booking.session && booking.session.expires_at > new Date()) {
      return {
        sessionUrl: booking.session.session_url,
        token: booking.session.session_token,
        expiresAt: booking.session.expires_at.toISOString(),
      };
    }

    // Generate new session link
    const token = randomUUID();
    const sessionUrl = `/session/${token}`;

    // Expires 30 min after booking end time on booking date
    const [endH, endM] = booking.end_time.split(':').map(Number);
    const expiresAt = new Date(booking.booking_date);
    expiresAt.setHours(endH, endM + 30, 0, 0);

    if (booking.session) {
      // Update expired session
      await this.prisma.booking_sessions.update({
        where: { id: booking.session.id },
        data: {
          session_token: token,
          session_url: sessionUrl,
          expires_at: expiresAt,
        },
      });
    } else {
      // Create new session
      await this.prisma.booking_sessions.create({
        data: {
          booking_id: bookingId,
          session_token: token,
          session_url: sessionUrl,
          expires_at: expiresAt,
        },
      });
    }

    return {
      sessionUrl,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private checkNoticePolicy(bookingDate: Date, startTime: string) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const bookingStart = new Date(bookingDate);
    bookingStart.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilBooking =
      (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < MIN_NOTICE_HOURS) {
      throw new BadRequestException({
        code: 'NOTICE_PERIOD_VIOLATION',
        message: `Impossible de modifier un rendez-vous moins de ${MIN_NOTICE_HOURS}h a l'avance`,
      });
    }
  }

  private async emitBookingNotification(
    userId: string,
    title: string,
    message: string,
    payload: Record<string, unknown>,
  ) {
    const input: EmitNotificationInput = {
      userId,
      channel: 'in_app',
      category: 'rdv',
      title,
      message,
      payload,
    };

    try {
      await this.notifications.emitNotification(input);
    } catch {
      // Non-blocking: notification failure should not break booking
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private resolveBookingPriceCents(booking: {
    payment?: { amount_cents: number } | null;
    mentor?: { mentor_profile?: { hourly_rate: number | null } | null } | null;
  }) {
    if (booking.payment?.amount_cents !== undefined) {
      return booking.payment.amount_cents;
    }
    const hourlyRate = booking.mentor?.mentor_profile?.hourly_rate;
    return typeof hourlyRate === 'number' ? Math.round(hourlyRate * 100) : null;
  }

  private mapBooking(booking: {
    id: string;
    student_id: string;
    mentor_id: string;
    slot_id: string;
    booking_date: Date;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      bookingId: booking.id,
      studentId: booking.student_id,
      mentorId: booking.mentor_id,
      slotId: booking.slot_id,
      bookingDate: booking.booking_date.toISOString().split('T')[0],
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      notes: booking.notes,
      cancelledBy: booking.cancelled_by,
      cancellationReason: booking.cancellation_reason,
      createdAt: booking.created_at.toISOString(),
      updatedAt: booking.updated_at.toISOString(),
    };
  }

  private async assertExternalCalendarAvailability(
    mentorId: string,
    bookingDate: Date,
    startTime: string,
    endTime: string,
  ) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startAt = new Date(bookingDate);
    startAt.setHours(startHour, startMinute, 0, 0);
    const endAt = new Date(bookingDate);
    endAt.setHours(endHour, endMinute, 0, 0);

    if (!this.prisma.mentor_calendar_busy_slots?.findFirst) {
      return;
    }
    const conflict = await this.prisma.mentor_calendar_busy_slots.findFirst({
      where: {
        mentor_id: mentorId,
        start_at: { lt: endAt },
        end_at: { gt: startAt },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException({
        code: 'EXTERNAL_CALENDAR_CONFLICT',
        message:
          'Ce creneau est deja occupe dans le calendrier externe du mentor',
      });
    }
  }

  private parseIsoDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    // Reject invalid dates (e.g. 2026-02-30)
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  private getStartOfTodayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
