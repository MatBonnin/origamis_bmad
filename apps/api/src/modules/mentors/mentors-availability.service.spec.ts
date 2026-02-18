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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    });
  };

  describe('getMyAvailability', () => {
    it('returns availability with slots', async () => {
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

  describe('createSlot', () => {
    it('creates a new slot', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findMany.mockResolvedValue([]);
      mockPrisma.mentor_availability_slots.create.mockResolvedValue({
        id: 'slot-new',
        day_of_week: 2,
        start_time: '14:00',
        end_time: '16:00',
        is_recurring: true,
        status: 'published',
        created_at: new Date(),
      });

      const result = await service.createSlot('mentor-1', {
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '16:00',
      });

      expect(result.slot.slotId).toBe('slot-new');
      expect(result.slot.dayOfWeek).toBe(2);
    });

    it('rejects if startTime >= endTime', async () => {
      setupMentorProfile();

      await expect(
        service.createSlot('mentor-1', {
          dayOfWeek: 1,
          startTime: '14:00',
          endTime: '12:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects overlapping slots', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findMany.mockResolvedValue([
        { start_time: '09:00', end_time: '12:00' },
      ]);

      await expect(
        service.createSlot('mentor-1', {
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '13:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires mentor profile', async () => {
      mockPrisma.mentor_profiles.findUnique.mockResolvedValue(null);

      await expect(
        service.createSlot('user-no-profile', {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateSlot', () => {
    it('updates an existing slot', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue({
        id: 'slot-1',
        availability_id: 'avail-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '12:00',
        is_recurring: true,
        status: 'published',
      });
      mockPrisma.mentor_availability_slots.findMany.mockResolvedValue([]);
      mockPrisma.mentor_availability_slots.update.mockResolvedValue({
        id: 'slot-1',
        day_of_week: 1,
        start_time: '10:00',
        end_time: '13:00',
        is_recurring: true,
        status: 'published',
        created_at: new Date(),
      });

      const result = await service.updateSlot('mentor-1', 'slot-1', {
        startTime: '10:00',
        endTime: '13:00',
      });

      expect(result.slot.startTime).toBe('10:00');
      expect(result.slot.endTime).toBe('13:00');
    });
  });

  describe('deleteSlot', () => {
    it('deletes a slot', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue({
        id: 'slot-1',
        availability_id: 'avail-1',
      });
      mockPrisma.mentor_availability_slots.delete.mockResolvedValue({});

      const result = await service.deleteSlot('mentor-1', 'slot-1');

      expect(result).toEqual({ success: true });
    });

    it('rejects if slot not found', async () => {
      setupMentorProfile();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSlot('mentor-1', 'slot-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMentorAvailability (student view)', () => {
    it('returns only published slots', async () => {
      mockPrisma.mentor_availability.findUnique.mockResolvedValue({
        is_available: true,
        next_available_at: null,
        timezone: 'Europe/Paris',
        slots: [
          {
            id: 'slot-pub',
            day_of_week: 3,
            start_time: '14:00',
            end_time: '17:00',
            is_recurring: true,
            status: 'published',
            created_at: new Date(),
          },
        ],
      });

      const result = await service.getMentorAvailability('mentor-1');

      expect(result.isAvailable).toBe(true);
      expect(result.slots).toHaveLength(1);
    });

    it('returns empty when no availability', async () => {
      mockPrisma.mentor_availability.findUnique.mockResolvedValue(null);

      const result = await service.getMentorAvailability('mentor-unknown');

      expect(result.isAvailable).toBe(false);
      expect(result.slots).toEqual([]);
    });
  });
});
