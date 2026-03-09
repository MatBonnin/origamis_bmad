import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

export interface CreateSlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  status?: string;
}

export interface UpdateSlotDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
  status?: string;
}

const ALLOWED_SLOT_STATUSES = new Set(['published', 'draft', 'blocked']);
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_TIMEZONES = new Set([
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
  'UTC',
]);

@Injectable()
export class MentorsAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyAvailability(userId: string) {
    const availability = await this.findOrCreateAvailability(userId);

    const slots = await this.prisma.mentor_availability_slots.findMany({
      where: { availability_id: availability.id },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    return {
      isAvailable: availability.is_available,
      nextAvailableAt: availability.next_available_at?.toISOString() ?? null,
      timezone: availability.timezone,
      slots: slots.map((s) => this.mapSlot(s)),
    };
  }

  async getMentorAvailability(mentorUserId: string) {
    const availability = await this.prisma.mentor_availability.findUnique({
      where: { mentor_user_id: mentorUserId },
      include: {
        slots: {
          where: { status: 'published' },
          orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
        },
      },
    });

    if (!availability) {
      return {
        isAvailable: false,
        nextAvailableAt: null,
        timezone: 'Europe/Paris',
        slots: [],
      };
    }

    return {
      isAvailable: availability.is_available,
      nextAvailableAt: availability.next_available_at?.toISOString() ?? null,
      timezone: availability.timezone,
      slots: availability.slots.map((s) => this.mapSlot(s)),
    };
  }

  async createSlot(userId: string, dto: CreateSlotDto) {
    this.validateDayOfWeek(dto.dayOfWeek);
    this.validateSlotStatus(dto.status);
    this.validateSlotTimes(dto.startTime, dto.endTime);

    const availability = await this.findOrCreateAvailability(userId);

    await this.checkOverlap(
      availability.id,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );

    const slot = await this.prisma.mentor_availability_slots.create({
      data: {
        availability_id: availability.id,
        day_of_week: dto.dayOfWeek,
        start_time: dto.startTime,
        end_time: dto.endTime,
        is_recurring: dto.isRecurring ?? true,
        status: dto.status ?? 'published',
      },
    });

    return { slot: this.mapSlot(slot) };
  }

  async updateSlot(userId: string, slotId: string, dto: UpdateSlotDto) {
    const availability = await this.findOrCreateAvailability(userId);
    const existing = await this.assertSlotOwnership(slotId, availability.id);

    const dayOfWeek = dto.dayOfWeek ?? existing.day_of_week;
    const startTime = dto.startTime ?? existing.start_time;
    const endTime = dto.endTime ?? existing.end_time;

    this.validateDayOfWeek(dayOfWeek);
    this.validateSlotStatus(dto.status);
    this.validateSlotTimes(startTime, endTime);
    await this.checkOverlap(
      availability.id,
      dayOfWeek,
      startTime,
      endTime,
      slotId,
    );

    const slot = await this.prisma.mentor_availability_slots.update({
      where: { id: slotId },
      data: {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_recurring: dto.isRecurring ?? existing.is_recurring,
        status: dto.status ?? existing.status,
      },
    });

    return { slot: this.mapSlot(slot) };
  }

  async deleteSlot(userId: string, slotId: string) {
    const availability = await this.findOrCreateAvailability(userId);
    await this.assertSlotOwnership(slotId, availability.id);

    const hasBookings = await this.prisma.bookings.findFirst({
      where: { slot_id: slotId },
      select: { id: true },
    });

    if (hasBookings) {
      throw new BadRequestException({
        code: 'SLOT_HAS_BOOKINGS',
        message:
          'Ce creneau est lie a des rendez-vous et ne peut pas etre supprime',
      });
    }

    await this.prisma.mentor_availability_slots.delete({
      where: { id: slotId },
    });

    return { success: true };
  }

  async updateGeneralAvailability(
    userId: string,
    data: {
      isAvailable?: boolean;
      nextAvailableAt?: string;
      timezone?: string;
    },
  ) {
    const availability = await this.findOrCreateAvailability(userId);
    this.validateTimezone(data.timezone);

    const updated = await this.prisma.mentor_availability.update({
      where: { id: availability.id },
      data: {
        is_available: data.isAvailable ?? availability.is_available,
        next_available_at: data.nextAvailableAt
          ? new Date(data.nextAvailableAt)
          : availability.next_available_at,
        timezone: data.timezone ?? availability.timezone,
      },
    });

    return {
      isAvailable: updated.is_available,
      nextAvailableAt: updated.next_available_at?.toISOString() ?? null,
      timezone: updated.timezone,
    };
  }

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

  private async assertSlotOwnership(slotId: string, availabilityId: string) {
    const slot = await this.prisma.mentor_availability_slots.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.availability_id !== availabilityId) {
      throw new NotFoundException({
        code: 'SLOT_NOT_FOUND',
        message: 'Creneau introuvable',
      });
    }

    return slot;
  }

  private validateSlotTimes(startTime: string, endTime: string) {
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      throw new BadRequestException({
        code: 'INVALID_TIME_FORMAT',
        message: "Le format d'heure doit etre HH:mm",
      });
    }

    if (startTime >= endTime) {
      throw new BadRequestException({
        code: 'INVALID_SLOT_TIMES',
        message: "L'heure de debut doit etre anterieure a l'heure de fin",
      });
    }
  }

  private validateDayOfWeek(dayOfWeek: number) {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException({
        code: 'INVALID_DAY_OF_WEEK',
        message: 'Le jour doit etre compris entre 0 (dimanche) et 6 (samedi)',
      });
    }
  }

  private validateSlotStatus(status?: string) {
    if (status && !ALLOWED_SLOT_STATUSES.has(status)) {
      throw new BadRequestException({
        code: 'INVALID_SLOT_STATUS',
        message: 'Statut de creneau invalide',
      });
    }
  }

  private validateTimezone(timezone?: string) {
    if (timezone && !VALID_TIMEZONES.has(timezone)) {
      throw new BadRequestException({
        code: 'INVALID_TIMEZONE',
        message: 'Fuseau horaire invalide',
      });
    }
  }

  private async checkOverlap(
    availabilityId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeSlotId?: string,
  ) {
    const existing = await this.prisma.mentor_availability_slots.findMany({
      where: {
        availability_id: availabilityId,
        day_of_week: dayOfWeek,
        ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
      },
    });

    for (const slot of existing) {
      if (startTime < slot.end_time && endTime > slot.start_time) {
        throw new BadRequestException({
          code: 'SLOT_OVERLAP',
          message: `Ce creneau chevauche un creneau existant (${slot.start_time}-${slot.end_time})`,
        });
      }
    }
  }

  private mapSlot(slot: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    status: string;
    created_at: Date;
  }) {
    return {
      slotId: slot.id,
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isRecurring: slot.is_recurring,
      status: slot.status,
      createdAt: slot.created_at.toISOString(),
    };
  }
}
