import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { MentorsAvailabilityService } from './mentors-availability.service';

describe('MentorsAvailabilityService', () => {
  let service: MentorsAvailabilityService;

  const mockPrisma = {
    mentor_profiles: { findUnique: jest.fn() },
    mentor_availability: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mentor_availability_slots: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mentor_weekly_schedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    mentor_date_overrides: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mentor_calendar_busy_slots: {
      findMany: jest.fn(),
    },
    bookings: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorsAvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MentorsAvailabilityService>(
      MentorsAvailabilityService,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupMentorProfile = () => {
    mockPrisma.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
    });
    mockPrisma.mentor_availability.findUnique.mockResolvedValue({
      id: 'avail-1',
      mentor_user_id: 'mentor-1',
      is_available: true,
      next_available_at: null,
      timezone: 'Europe/Paris',
      session_duration: 60,
      buffer_before: 0,
      buffer_after: 0,
      min_notice_hours: 1,
      max_days_ahead: 60,
      start_time_increment: 30,
      daily_limit: null,
      weekly_limit: null,
    });
    mockPrisma.mentor_weekly_schedule.findMany.mockResolvedValue([]);
    mockPrisma.mentor_date_overrides.findMany.mockResolvedValue([]);
    mockPrisma.mentor_availability_slots.findMany.mockResolvedValue([]);
  };

  describe('getMyFullAvailability', () => {
    it('returns full availability with settings', async () => {
      setupMentorProfile();
      mockPrisma.mentor_weekly_schedule.findMany.mockResolvedValue([
        {
          id: 'ws-1',
          day_of_week: 1,
          is_available: true,
          time_windows: [{ start: '09:00', end: '12:00' }],
        },
      ]);

      const result = await service.getMyFullAvailability('mentor-1');

      expect(result.isAvailable).toBe(true);
      expect(result.settings.sessionDuration).toBe(60);
      expect(result.settings.timezone).toBe('Europe/Paris');
      expect(result.weeklySchedule).toHaveLength(7);
      expect(result.weeklySchedule[1].isAvailable).toBe(true);
    });
  });

  describe('getMyAvailability (legacy)', () => {
    it('returns availability with legacy slots format', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findMany.mockResolvedValue([
        {
          id: 'slot-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
          is_recurring: true,
          status: 'published',
          created_at: new Date('2026-02-17T10:00:00Z'),
        },
      ]);

      const result = await service.getMyAvailability('mentor-1');

      expect(result.isAvailable).toBe(true);
      expect(result.timezone).toBe('Europe/Paris');
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].dayOfWeek).toBe(1);
    });
  });

  describe('updateSchedulingSettings', () => {
    it('updates session duration and buffers', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability.update.mockResolvedValue({
        session_duration: 90,
        buffer_before: 15,
        buffer_after: 15,
        min_notice_hours: 48,
        max_days_ahead: 30,
        start_time_increment: 30,
        daily_limit: 4,
        weekly_limit: null,
        timezone: 'Europe/Paris',
      });

      const result = await service.updateSchedulingSettings('mentor-1', {
        sessionDuration: 90,
        bufferBefore: 15,
        bufferAfter: 15,
        minNoticeHours: 48,
        maxDaysAhead: 30,
        dailyLimit: 4,
      });

      expect(result.sessionDuration).toBe(90);
      expect(result.bufferBefore).toBe(15);
      expect(result.dailyLimit).toBe(4);
    });

    it('rejects invalid session duration', async () => {
      setupMentorProfile();

      await expect(
        service.updateSchedulingSettings('mentor-1', {
          sessionDuration: 25, // Invalid: not in [30, 45, 60, 90, 120]
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid start time increment', async () => {
      setupMentorProfile();

      await expect(
        service.updateSchedulingSettings('mentor-1', {
          startTimeIncrement: 45, // Invalid: not in [15, 30, 60]
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid timezone', async () => {
      setupMentorProfile();

      await expect(
        service.updateSchedulingSettings('mentor-1', {
          timezone: 'Mars/Olympus',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateWeeklySchedule', () => {
    it('updates weekly schedule for multiple days', async () => {
      setupMentorProfile();
      mockPrisma.mentor_weekly_schedule.upsert.mockImplementation((args) => ({
        id: `ws-${args.create.day_of_week}`,
        day_of_week: args.create.day_of_week,
        is_available: args.create.is_available,
        time_windows: args.create.time_windows,
      }));

      const result = await service.updateWeeklySchedule('mentor-1', [
        {
          dayOfWeek: 1,
          isAvailable: true,
          timeWindows: [{ start: '09:00', end: '12:00' }],
        },
        {
          dayOfWeek: 2,
          isAvailable: true,
          timeWindows: [{ start: '14:00', end: '18:00' }],
        },
      ]);

      expect(result).toHaveLength(7); // All 7 days returned
    });

    it('rejects overlapping time windows', async () => {
      setupMentorProfile();

      await expect(
        service.updateWeeklySchedule('mentor-1', [
          {
            dayOfWeek: 1,
            isAvailable: true,
            timeWindows: [
              { start: '09:00', end: '12:00' },
              { start: '11:00', end: '14:00' }, // Overlaps
            ],
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid time format', async () => {
      setupMentorProfile();

      await expect(
        service.updateWeeklySchedule('mentor-1', [
          {
            dayOfWeek: 1,
            isAvailable: true,
            timeWindows: [{ start: '9:00', end: '12:00' }], // Invalid format
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid day of week', async () => {
      setupMentorProfile();

      await expect(
        service.updateWeeklySchedule('mentor-1', [
          {
            dayOfWeek: 7, // Invalid: must be 0-6
            isAvailable: true,
            timeWindows: [],
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDateOverride', () => {
    it('creates unavailable override', async () => {
      setupMentorProfile();
      mockPrisma.mentor_date_overrides.findUnique.mockResolvedValue(null);
      mockPrisma.mentor_date_overrides.create.mockResolvedValue({
        id: 'override-1',
        date: new Date('2026-04-15'),
        override_type: 'unavailable',
        time_windows: null,
        reason: 'Vacances',
      });

      const result = await service.createDateOverride('mentor-1', {
        date: '2026-04-15',
        overrideType: 'unavailable',
        reason: 'Vacances',
      });

      expect(result.id).toBe('override-1');
      expect(result.overrideType).toBe('unavailable');
      expect(result.reason).toBe('Vacances');
    });

    it('creates custom hours override', async () => {
      setupMentorProfile();
      mockPrisma.mentor_date_overrides.findUnique.mockResolvedValue(null);
      mockPrisma.mentor_date_overrides.create.mockResolvedValue({
        id: 'override-2',
        date: new Date('2026-04-20'),
        override_type: 'custom_hours',
        time_windows: [{ start: '10:00', end: '11:00' }],
        reason: 'RDV medecin',
      });

      const result = await service.createDateOverride('mentor-1', {
        date: '2026-04-20',
        overrideType: 'custom_hours',
        timeWindows: [{ start: '10:00', end: '11:00' }],
        reason: 'RDV medecin',
      });

      expect(result.overrideType).toBe('custom_hours');
      expect(result.timeWindows).toHaveLength(1);
    });

    it('rejects custom_hours without time windows', async () => {
      setupMentorProfile();

      await expect(
        service.createDateOverride('mentor-1', {
          date: '2026-04-20',
          overrideType: 'custom_hours',
          // Missing timeWindows
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects past date', async () => {
      setupMentorProfile();

      await expect(
        service.createDateOverride('mentor-1', {
          date: '2020-01-01', // Past date
          overrideType: 'unavailable',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate date', async () => {
      setupMentorProfile();
      mockPrisma.mentor_date_overrides.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.createDateOverride('mentor-1', {
          date: '2026-04-15',
          overrideType: 'unavailable',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteDateOverride', () => {
    it('deletes an override', async () => {
      setupMentorProfile();
      mockPrisma.mentor_date_overrides.findUnique.mockResolvedValue({
        id: 'override-1',
        availability_id: 'avail-1',
      });
      mockPrisma.mentor_date_overrides.delete.mockResolvedValue({});

      const result = await service.deleteDateOverride('mentor-1', 'override-1');

      expect(result).toEqual({ success: true });
    });

    it('rejects if override not found', async () => {
      setupMentorProfile();
      mockPrisma.mentor_date_overrides.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDateOverride('mentor-1', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGeneralAvailability', () => {
    it('updates isAvailable', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability.update.mockResolvedValue({
        is_available: false,
        next_available_at: new Date('2026-04-01'),
      });

      const result = await service.updateGeneralAvailability('mentor-1', {
        isAvailable: false,
        nextAvailableAt: '2026-04-01T00:00:00.000Z',
      });

      expect(result.isAvailable).toBe(false);
    });
  });

  describe('getAvailableSlots (student view)', () => {
    it('returns empty when mentor unavailable', async () => {
      mockPrisma.mentor_availability.findUnique.mockResolvedValue({
        is_available: false,
        timezone: 'Europe/Paris',
        session_duration: 60,
      });

      const result = await service.getAvailableSlots('mentor-1');

      expect(result.slots).toEqual([]);
    });

    it('returns empty when no availability record', async () => {
      mockPrisma.mentor_availability.findUnique.mockResolvedValue(null);

      const result = await service.getAvailableSlots('mentor-unknown');

      expect(result.slots).toEqual([]);
    });

    it('generates slots from weekly schedule', async () => {
      mockPrisma.mentor_availability.findUnique.mockResolvedValue({
        id: 'avail-1',
        mentor_user_id: 'mentor-1',
        is_available: true,
        timezone: 'Europe/Paris',
        session_duration: 60,
        buffer_before: 0,
        buffer_after: 0,
        min_notice_hours: 1, // 1 hour notice
        max_days_ahead: 7,
        start_time_increment: 60,
        daily_limit: null,
        weekly_limit: null,
        mentor: { hourly_rate: 5000 },
        weekly_schedules: [
          {
            day_of_week: 1, // Monday
            is_available: true,
            time_windows: [{ start: '09:00', end: '12:00' }],
          },
        ],
        date_overrides: [],
      });
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.mentor_calendar_busy_slots.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots('mentor-1');

      expect(result.timezone).toBe('Europe/Paris');
      expect(result.sessionDuration).toBe(60);
      // Slots should be generated for next Monday
    });

    it('keeps same-day slots that still satisfy min notice', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T08:00:00.000Z'));

      mockPrisma.mentor_availability.findUnique.mockResolvedValue({
        id: 'avail-1',
        mentor_user_id: 'mentor-1',
        is_available: true,
        timezone: 'Europe/Paris',
        session_duration: 60,
        buffer_before: 0,
        buffer_after: 0,
        min_notice_hours: 4,
        max_days_ahead: 7,
        start_time_increment: 60,
        daily_limit: null,
        weekly_limit: null,
        mentor: { hourly_rate: null },
        weekly_schedules: [
          {
            day_of_week: 4, // Thursday
            is_available: true,
            time_windows: [{ start: '09:00', end: '17:00' }],
          },
        ],
        date_overrides: [],
      });
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.mentor_calendar_busy_slots.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots('mentor-1');
      const sameDaySlots = result.slots.filter(
        (slot) => slot.date === '2026-03-12',
      );

      expect(sameDaySlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ startTime: '12:00', isAvailable: true }),
          expect.objectContaining({ startTime: '13:00', isAvailable: true }),
        ]),
      );
      expect(sameDaySlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ startTime: '09:00', isAvailable: false }),
          expect.objectContaining({ startTime: '11:00', isAvailable: false }),
        ]),
      );
    });
  });

  describe('requires mentor profile', () => {
    it('throws ForbiddenException without mentor profile', async () => {
      mockPrisma.mentor_profiles.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSchedulingSettings('user-no-profile', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
