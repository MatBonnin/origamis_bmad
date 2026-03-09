import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  AvailableSlotsResponse,
  CreateDateOverrideDto,
  DateOverrideResponse,
  DayScheduleDto,
  FullAvailabilityResponse,
  SchedulingSettings,
  TimeWindowDto,
  UpdateDateOverrideDto,
  UpdateGeneralAvailabilityDto,
  UpdateSchedulingSettingsDto,
  WeeklyScheduleResponse,
} from './dto/mentor-availability.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_SESSION_DURATIONS = new Set([30, 45, 60, 90, 120]);
const VALID_START_INCREMENTS = new Set([15, 30, 60]);

const DAY_NAMES = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TimeWindow {
  start: string;
  end: string;
}

// Helper to safely cast JSON to TimeWindow array
function toTimeWindows(json: unknown): TimeWindow[] {
  if (!Array.isArray(json)) return [];
  return json as TimeWindow[];
}

// Helper to convert TimeWindowDto[] to JSON-compatible format
function toJsonTimeWindows(windows: TimeWindowDto[]): Array<{ start: string; end: string }> {
  return windows.map(w => ({ start: w.start, end: w.end }));
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MentorsAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL AVAILABILITY (Mentor view)
  // ═══════════════════════════════════════════════════════════════════════════

  async getMyFullAvailability(userId: string): Promise<FullAvailabilityResponse> {
    const availability = await this.findOrCreateAvailability(userId);

    const weeklySchedules = await this.prisma.mentor_weekly_schedule.findMany({
      where: { availability_id: availability.id },
      orderBy: { day_of_week: 'asc' },
    });

    const dateOverrides = await this.prisma.mentor_date_overrides.findMany({
      where: { availability_id: availability.id },
      orderBy: { date: 'asc' },
    });

    // Build weekly schedule response (fill missing days)
    const weeklyScheduleMap = new Map(
      weeklySchedules.map((ws) => [ws.day_of_week, ws]),
    );

    const weeklyScheduleResponse: WeeklyScheduleResponse[] = [];
    for (let day = 0; day < 7; day++) {
      const schedule = weeklyScheduleMap.get(day);
      weeklyScheduleResponse.push({
        dayOfWeek: day,
        dayName: DAY_NAMES[day],
        isAvailable: schedule?.is_available ?? false,
        timeWindows: schedule ? toTimeWindows(schedule.time_windows) : [],
      });
    }

    return {
      isAvailable: availability.is_available,
      nextAvailableAt: availability.next_available_at?.toISOString() ?? null,
      settings: {
        sessionDuration: availability.session_duration,
        bufferBefore: availability.buffer_before,
        bufferAfter: availability.buffer_after,
        minNoticeHours: availability.min_notice_hours,
        maxDaysAhead: availability.max_days_ahead,
        startTimeIncrement: availability.start_time_increment,
        dailyLimit: availability.daily_limit,
        weeklyLimit: availability.weekly_limit,
        timezone: availability.timezone,
      },
      weeklySchedule: weeklyScheduleResponse,
      dateOverrides: dateOverrides.map((o) => this.mapDateOverride(o)),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULING SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async updateSchedulingSettings(
    userId: string,
    dto: UpdateSchedulingSettingsDto,
  ): Promise<SchedulingSettings> {
    const availability = await this.findOrCreateAvailability(userId);

    // Validate values
    if (dto.sessionDuration && !VALID_SESSION_DURATIONS.has(dto.sessionDuration)) {
      throw new BadRequestException({
        code: 'INVALID_SESSION_DURATION',
        message: 'Duree de session invalide (30, 45, 60, 90, 120 minutes)',
      });
    }

    if (dto.startTimeIncrement && !VALID_START_INCREMENTS.has(dto.startTimeIncrement)) {
      throw new BadRequestException({
        code: 'INVALID_START_INCREMENT',
        message: 'Intervalle invalide (15, 30, 60 minutes)',
      });
    }

    if (dto.timezone) {
      this.validateTimezone(dto.timezone);
    }

    const updated = await this.prisma.mentor_availability.update({
      where: { id: availability.id },
      data: {
        session_duration: dto.sessionDuration ?? availability.session_duration,
        buffer_before: dto.bufferBefore ?? availability.buffer_before,
        buffer_after: dto.bufferAfter ?? availability.buffer_after,
        min_notice_hours: dto.minNoticeHours ?? availability.min_notice_hours,
        max_days_ahead: dto.maxDaysAhead ?? availability.max_days_ahead,
        start_time_increment: dto.startTimeIncrement ?? availability.start_time_increment,
        daily_limit: dto.dailyLimit !== undefined ? dto.dailyLimit : availability.daily_limit,
        weekly_limit: dto.weeklyLimit !== undefined ? dto.weeklyLimit : availability.weekly_limit,
        timezone: dto.timezone ?? availability.timezone,
      },
    });

    return {
      sessionDuration: updated.session_duration,
      bufferBefore: updated.buffer_before,
      bufferAfter: updated.buffer_after,
      minNoticeHours: updated.min_notice_hours,
      maxDaysAhead: updated.max_days_ahead,
      startTimeIncrement: updated.start_time_increment,
      dailyLimit: updated.daily_limit,
      weeklyLimit: updated.weekly_limit,
      timezone: updated.timezone,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL AVAILABILITY (on/off)
  // ═══════════════════════════════════════════════════════════════════════════

  async updateGeneralAvailability(
    userId: string,
    dto: UpdateGeneralAvailabilityDto,
  ) {
    const availability = await this.findOrCreateAvailability(userId);

    const updated = await this.prisma.mentor_availability.update({
      where: { id: availability.id },
      data: {
        is_available: dto.isAvailable ?? availability.is_available,
        next_available_at: dto.nextAvailableAt
          ? new Date(dto.nextAvailableAt)
          : availability.next_available_at,
      },
    });

    return {
      isAvailable: updated.is_available,
      nextAvailableAt: updated.next_available_at?.toISOString() ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEKLY SCHEDULE
  // ═══════════════════════════════════════════════════════════════════════════

  async updateWeeklySchedule(
    userId: string,
    schedule: DayScheduleDto[],
  ): Promise<WeeklyScheduleResponse[]> {
    const availability = await this.findOrCreateAvailability(userId);

    // Validate all time windows
    for (const day of schedule) {
      this.validateDayOfWeek(day.dayOfWeek);
      this.validateTimeWindows(day.timeWindows);
    }

    // Upsert each day
    const results: WeeklyScheduleResponse[] = [];

    for (const day of schedule) {
      const jsonTimeWindows = toJsonTimeWindows(day.timeWindows);
      const upserted = await this.prisma.mentor_weekly_schedule.upsert({
        where: {
          availability_id_day_of_week: {
            availability_id: availability.id,
            day_of_week: day.dayOfWeek,
          },
        },
        create: {
          availability_id: availability.id,
          day_of_week: day.dayOfWeek,
          is_available: day.isAvailable,
          time_windows: jsonTimeWindows,
        },
        update: {
          is_available: day.isAvailable,
          time_windows: jsonTimeWindows,
        },
      });

      results.push({
        dayOfWeek: upserted.day_of_week,
        dayName: DAY_NAMES[upserted.day_of_week],
        isAvailable: upserted.is_available,
        timeWindows: toTimeWindows(upserted.time_windows),
      });
    }

    // Fill missing days
    const existingDays = new Set(results.map((r) => r.dayOfWeek));
    for (let day = 0; day < 7; day++) {
      if (!existingDays.has(day)) {
        const existing = await this.prisma.mentor_weekly_schedule.findUnique({
          where: {
            availability_id_day_of_week: {
              availability_id: availability.id,
              day_of_week: day,
            },
          },
        });

        results.push({
          dayOfWeek: day,
          dayName: DAY_NAMES[day],
          isAvailable: existing?.is_available ?? false,
          timeWindows: existing ? toTimeWindows(existing.time_windows) : [],
        });
      }
    }

    // Sort by day
    results.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    return results;
  }

  async updateSingleDaySchedule(
    userId: string,
    dayOfWeek: number,
    isAvailable: boolean,
    timeWindows: TimeWindowDto[],
  ): Promise<WeeklyScheduleResponse> {
    const availability = await this.findOrCreateAvailability(userId);

    this.validateDayOfWeek(dayOfWeek);
    this.validateTimeWindows(timeWindows);

    const jsonTimeWindows = toJsonTimeWindows(timeWindows);
    const upserted = await this.prisma.mentor_weekly_schedule.upsert({
      where: {
        availability_id_day_of_week: {
          availability_id: availability.id,
          day_of_week: dayOfWeek,
        },
      },
      create: {
        availability_id: availability.id,
        day_of_week: dayOfWeek,
        is_available: isAvailable,
        time_windows: jsonTimeWindows,
      },
      update: {
        is_available: isAvailable,
        time_windows: jsonTimeWindows,
      },
    });

    return {
      dayOfWeek: upserted.day_of_week,
      dayName: DAY_NAMES[upserted.day_of_week],
      isAvailable: upserted.is_available,
      timeWindows: toTimeWindows(upserted.time_windows),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE OVERRIDES
  // ═══════════════════════════════════════════════════════════════════════════

  async createDateOverride(
    userId: string,
    dto: CreateDateOverrideDto,
  ): Promise<DateOverrideResponse> {
    const availability = await this.findOrCreateAvailability(userId);

    // Validate date format
    if (!DATE_REGEX.test(dto.date)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message: 'Format de date invalide (YYYY-MM-DD)',
      });
    }

    const date = new Date(dto.date + 'T00:00:00.000Z');

    // Validate date is in the future
    const today = this.getStartOfTodayUtc();
    if (date < today) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'La date doit etre dans le futur',
      });
    }

    // Validate time windows if custom_hours
    if (dto.overrideType === 'custom_hours') {
      if (!dto.timeWindows || dto.timeWindows.length === 0) {
        throw new BadRequestException({
          code: 'TIME_WINDOWS_REQUIRED',
          message: 'Les fenetres horaires sont requises pour les horaires personnalises',
        });
      }
      this.validateTimeWindows(dto.timeWindows);
    }

    // Check if override already exists
    const existing = await this.prisma.mentor_date_overrides.findUnique({
      where: {
        availability_id_date: {
          availability_id: availability.id,
          date: date,
        },
      },
    });

    if (existing) {
      throw new BadRequestException({
        code: 'OVERRIDE_EXISTS',
        message: 'Une exception existe deja pour cette date',
      });
    }

    const created = await this.prisma.mentor_date_overrides.create({
      data: {
        availability_id: availability.id,
        date: date,
        override_type: dto.overrideType,
        time_windows: dto.timeWindows ? toJsonTimeWindows(dto.timeWindows) : undefined,
        reason: dto.reason ?? null,
      },
    });

    return this.mapDateOverride(created);
  }

  async updateDateOverride(
    userId: string,
    overrideId: string,
    dto: UpdateDateOverrideDto,
  ): Promise<DateOverrideResponse> {
    const availability = await this.findOrCreateAvailability(userId);

    const existing = await this.prisma.mentor_date_overrides.findUnique({
      where: { id: overrideId },
    });

    if (!existing || existing.availability_id !== availability.id) {
      throw new NotFoundException({
        code: 'OVERRIDE_NOT_FOUND',
        message: 'Exception introuvable',
      });
    }

    const overrideType = dto.overrideType ?? existing.override_type;

    // Validate time windows if custom_hours
    if (overrideType === 'custom_hours') {
      const timeWindows = dto.timeWindows ?? (existing.time_windows as TimeWindow[] | null);
      if (!timeWindows || timeWindows.length === 0) {
        throw new BadRequestException({
          code: 'TIME_WINDOWS_REQUIRED',
          message: 'Les fenetres horaires sont requises pour les horaires personnalises',
        });
      }
      if (dto.timeWindows) {
        this.validateTimeWindows(dto.timeWindows);
      }
    }

    const updated = await this.prisma.mentor_date_overrides.update({
      where: { id: overrideId },
      data: {
        override_type: overrideType,
        time_windows: dto.timeWindows !== undefined
          ? toJsonTimeWindows(dto.timeWindows)
          : undefined,
        reason: dto.reason !== undefined ? dto.reason : existing.reason,
      },
    });

    return this.mapDateOverride(updated);
  }

  async deleteDateOverride(userId: string, overrideId: string): Promise<{ success: boolean }> {
    const availability = await this.findOrCreateAvailability(userId);

    const existing = await this.prisma.mentor_date_overrides.findUnique({
      where: { id: overrideId },
    });

    if (!existing || existing.availability_id !== availability.id) {
      throw new NotFoundException({
        code: 'OVERRIDE_NOT_FOUND',
        message: 'Exception introuvable',
      });
    }

    await this.prisma.mentor_date_overrides.delete({
      where: { id: overrideId },
    });

    return { success: true };
  }

  async listDateOverrides(userId: string): Promise<DateOverrideResponse[]> {
    const availability = await this.findOrCreateAvailability(userId);

    const overrides = await this.prisma.mentor_date_overrides.findMany({
      where: {
        availability_id: availability.id,
        date: { gte: this.getStartOfTodayUtc() },
      },
      orderBy: { date: 'asc' },
    });

    return overrides.map((o) => this.mapDateOverride(o));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABLE SLOTS (Student view)
  // ═══════════════════════════════════════════════════════════════════════════

  async getAvailableSlots(
    mentorUserId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AvailableSlotsResponse> {
    const availability = await this.prisma.mentor_availability.findUnique({
      where: { mentor_user_id: mentorUserId },
      include: {
        mentor: {
          select: {
            hourly_rate: true,
          },
        },
        weekly_schedules: true,
        date_overrides: true,
      },
    });

    if (!availability || !availability.is_available) {
      return {
        mentorId: mentorUserId,
        timezone: availability?.timezone ?? 'Europe/Paris',
        sessionDuration: availability?.session_duration ?? 60,
        hourlyRate: availability?.mentor?.hourly_rate ?? null,
        slots: [],
        dateRange: { start: '', end: '' },
      };
    }

    // Calculate date range
    const today = this.getStartOfTodayUtc();
    const minNoticeDate = new Date(today);
    minNoticeDate.setHours(minNoticeDate.getHours() + availability.min_notice_hours);

    const rangeStart = startDate
      ? new Date(startDate + 'T00:00:00.000Z')
      : new Date(Math.max(today.getTime(), minNoticeDate.getTime()));

    const maxEndDate = new Date(today);
    maxEndDate.setDate(maxEndDate.getDate() + availability.max_days_ahead);

    const rangeEnd = endDate
      ? new Date(endDate + 'T00:00:00.000Z')
      : maxEndDate;

    // Ensure range doesn't exceed max_days_ahead
    if (rangeEnd > maxEndDate) {
      rangeEnd.setTime(maxEndDate.getTime());
    }

    // Build weekly schedule map
    const weeklyScheduleMap = new Map(
      availability.weekly_schedules.map((ws) => [ws.day_of_week, ws]),
    );

    // Build date overrides map
    const dateOverridesMap = new Map(
      availability.date_overrides.map((o) => [
        o.date.toISOString().split('T')[0],
        o,
      ]),
    );

    // Get existing bookings for this mentor in the date range
    const existingBookings = await this.prisma.bookings.findMany({
      where: {
        mentor_id: mentorUserId,
        booking_date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: { notIn: ['cancelled'] },
      },
      select: {
        booking_date: true,
        start_time: true,
        end_time: true,
      },
    });

    // Build booking map by date
    const bookingsMap = new Map<string, Array<{ start: string; end: string }>>();
    for (const booking of existingBookings) {
      const dateKey = booking.booking_date.toISOString().split('T')[0];
      if (!bookingsMap.has(dateKey)) {
        bookingsMap.set(dateKey, []);
      }
      bookingsMap.get(dateKey)!.push({
        start: booking.start_time,
        end: booking.end_time,
      });
    }

    // Get busy slots from external calendar
    const busySlots = await this.prisma.mentor_calendar_busy_slots.findMany({
      where: {
        mentor_id: mentorUserId,
        start_at: { lte: rangeEnd },
        end_at: { gte: rangeStart },
      },
    });

    // Build busy slots map by date
    const busySlotsMap = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
    for (const busy of busySlots) {
      const dateKey = busy.start_at.toISOString().split('T')[0];
      if (!busySlotsMap.has(dateKey)) {
        busySlotsMap.set(dateKey, []);
      }
      busySlotsMap.get(dateKey)!.push({
        startAt: busy.start_at,
        endAt: busy.end_at,
      });
    }

    // Count bookings for limits
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyBookingsCount = existingBookings.filter(
      (b) => b.booking_date >= weekStart && b.booking_date < weekEnd,
    ).length;

    // Generate slots
    const slots: Array<{
      date: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }> = [];

    const currentDate = new Date(rangeStart);
    while (currentDate <= rangeEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getUTCDay();

      // Check for date override
      const override = dateOverridesMap.get(dateStr);

      let timeWindows: TimeWindow[] = [];

      if (override) {
        if (override.override_type === 'unavailable') {
          // Skip this day entirely
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        } else if (override.override_type === 'custom_hours') {
          timeWindows = toTimeWindows(override.time_windows);
        }
      } else {
        // Use weekly schedule
        const weeklySchedule = weeklyScheduleMap.get(dayOfWeek);
        if (!weeklySchedule?.is_available) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        timeWindows = toTimeWindows(weeklySchedule.time_windows);
      }

      // Count daily bookings
      const dailyBookings = bookingsMap.get(dateStr) ?? [];

      // Generate slots for each time window
      for (const window of timeWindows) {
        const windowSlots = this.generateSlotsForWindow(
          window,
          availability.session_duration,
          availability.start_time_increment,
          availability.buffer_before,
          availability.buffer_after,
        );

        for (const slot of windowSlots) {
          // Check if slot is available
          let isAvailable = true;

          // Check min notice
          const slotDateTime = new Date(
            `${dateStr}T${slot.startTime}:00.000Z`,
          );
          if (slotDateTime < minNoticeDate) {
            isAvailable = false;
          }

          // Check existing bookings
          if (isAvailable && dailyBookings.some((b) =>
            this.timesOverlap(slot.startTime, slot.endTime, b.start, b.end)
          )) {
            isAvailable = false;
          }

          // Check busy slots
          const dayBusySlots = busySlotsMap.get(dateStr) ?? [];
          if (isAvailable && dayBusySlots.some((busy) => {
            const slotStart = new Date(`${dateStr}T${slot.startTime}:00.000Z`);
            const slotEnd = new Date(`${dateStr}T${slot.endTime}:00.000Z`);
            return slotStart < busy.endAt && slotEnd > busy.startAt;
          })) {
            isAvailable = false;
          }

          // Check daily limit
          if (
            isAvailable &&
            availability.daily_limit &&
            dailyBookings.length >= availability.daily_limit
          ) {
            isAvailable = false;
          }

          // Check weekly limit
          if (
            isAvailable &&
            availability.weekly_limit &&
            weeklyBookingsCount >= availability.weekly_limit
          ) {
            isAvailable = false;
          }

          slots.push({
            date: dateStr,
            dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      mentorId: mentorUserId,
      timezone: availability.timezone,
      sessionDuration: availability.session_duration,
      hourlyRate: availability.mentor.hourly_rate ?? null,
      slots,
      dateRange: {
        start: rangeStart.toISOString().split('T')[0],
        end: rangeEnd.toISOString().split('T')[0],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY SUPPORT - Keep old slot-based methods for backward compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  async getMyAvailability(userId: string) {
    const full = await this.getMyFullAvailability(userId);

    // Convert to old format for backward compatibility
    const legacySlots = await this.prisma.mentor_availability_slots.findMany({
      where: {
        availability: { mentor_user_id: userId },
      },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    return {
      isAvailable: full.isAvailable,
      nextAvailableAt: full.nextAvailableAt,
      timezone: full.settings.timezone,
      settings: full.settings,
      weeklySchedule: full.weeklySchedule,
      dateOverrides: full.dateOverrides,
      // Legacy slots
      slots: legacySlots.map((s) => ({
        slotId: s.id,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
        isRecurring: s.is_recurring,
        status: s.status,
        createdAt: s.created_at.toISOString(),
      })),
    };
  }

  async getMentorAvailability(mentorUserId: string) {
    return this.getAvailableSlots(mentorUserId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async findOrCreateAvailability(userId: string) {
    const profile = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new ForbiddenException({
        code: 'MENTOR_PROFILE_REQUIRED',
        message: 'Un profil mentor est requis pour gerer les disponibilites',
      });
    }

    let availability = await this.prisma.mentor_availability.findUnique({
      where: { mentor_user_id: userId },
    });

    if (!availability) {
      availability = await this.prisma.mentor_availability.create({
        data: { mentor_user_id: userId },
      });
    }

    return availability;
  }

  private validateDayOfWeek(dayOfWeek: number) {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException({
        code: 'INVALID_DAY_OF_WEEK',
        message: 'Le jour doit etre compris entre 0 (dimanche) et 6 (samedi)',
      });
    }
  }

  private validateTimeWindows(windows: TimeWindowDto[]) {
    for (const window of windows) {
      if (!TIME_REGEX.test(window.start) || !TIME_REGEX.test(window.end)) {
        throw new BadRequestException({
          code: 'INVALID_TIME_FORMAT',
          message: "Le format d'heure doit etre HH:mm",
        });
      }

      if (window.start >= window.end) {
        throw new BadRequestException({
          code: 'INVALID_TIME_WINDOW',
          message: "L'heure de debut doit etre anterieure a l'heure de fin",
        });
      }
    }

    // Check for overlapping windows
    const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        throw new BadRequestException({
          code: 'OVERLAPPING_WINDOWS',
          message: 'Les fenetres horaires ne doivent pas se chevaucher',
        });
      }
    }
  }

  private validateTimezone(timezone: string) {
    try {
      // Check if timezone is valid by trying to format a date with it
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      throw new BadRequestException({
        code: 'INVALID_TIMEZONE',
        message: 'Fuseau horaire invalide',
      });
    }
  }

  private mapDateOverride(override: {
    id: string;
    date: Date;
    override_type: string;
    time_windows: unknown;
    reason: string | null;
  }): DateOverrideResponse {
    return {
      id: override.id,
      date: override.date.toISOString().split('T')[0],
      overrideType: override.override_type as 'unavailable' | 'custom_hours',
      timeWindows: override.time_windows as TimeWindow[] | null,
      reason: override.reason,
    };
  }

  private generateSlotsForWindow(
    window: TimeWindow,
    sessionDuration: number,
    increment: number,
    bufferBefore: number,
    bufferAfter: number,
  ): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];

    const [windowStartH, windowStartM] = window.start.split(':').map(Number);
    const [windowEndH, windowEndM] = window.end.split(':').map(Number);

    const windowStartMinutes = windowStartH * 60 + windowStartM;
    const windowEndMinutes = windowEndH * 60 + windowEndM;

    // Total time needed per slot (buffer + session + buffer)
    const totalSlotTime = bufferBefore + sessionDuration + bufferAfter;

    let currentMinutes = windowStartMinutes;

    while (currentMinutes + totalSlotTime <= windowEndMinutes) {
      const slotStartMinutes = currentMinutes + bufferBefore;
      const slotEndMinutes = slotStartMinutes + sessionDuration;

      const startTime = this.minutesToTime(slotStartMinutes);
      const endTime = this.minutesToTime(slotEndMinutes);

      slots.push({ startTime, endTime });

      // Move to next slot based on increment
      currentMinutes += increment;
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  private getStartOfTodayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  }
}
