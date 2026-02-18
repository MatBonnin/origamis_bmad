import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockPrisma = {
    mentor_availability_slots: { findUnique: jest.fn() },
    bookings: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotifications = {
    emitNotification: jest.fn().mockResolvedValue({ sent: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  const validSlot = {
    id: 'slot-1',
    availability_id: 'avail-1',
    day_of_week: 3, // Wednesday
    start_time: '14:00',
    end_time: '16:00',
    is_recurring: true,
    status: 'published',
    availability: {
      id: 'avail-1',
      mentor_user_id: 'mentor-1',
      is_available: true,
      timezone: 'Europe/Paris',
    },
  };

  // Next Wednesday
  const getNextWednesday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((3 + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().split('T')[0];
  };

  describe('createBooking', () => {
    it('creates a confirmed booking', async () => {
      const bookingDate = getNextWednesday();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(validSlot);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.create.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        slot_id: 'slot-1',
        booking_date: new Date(bookingDate),
        start_time: '14:00',
        end_time: '16:00',
        status: 'confirmed',
        notes: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createBooking('student-1', {
        mentorId: 'mentor-1',
        slotId: 'slot-1',
        bookingDate,
      });

      expect(result.booking.bookingId).toBe('booking-1');
      expect(result.booking.status).toBe('confirmed');
      expect(mockNotifications.emitNotification).toHaveBeenCalledTimes(2);
    });

    it('rejects booking when slot not found', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking('student-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-missing',
          bookingDate: getNextWednesday(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects booking when mentor is unavailable', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue({
        ...validSlot,
        availability: { ...validSlot.availability, is_available: false },
      });

      await expect(
        service.createBooking('student-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate: getNextWednesday(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects self-booking', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(validSlot);

      await expect(
        service.createBooking('mentor-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate: getNextWednesday(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when day of week does not match slot', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(validSlot);

      // Pick a Thursday (day_of_week=4) instead of Wednesday (3)
      const d = new Date();
      d.setDate(d.getDate() + ((4 + 7 - d.getDay()) % 7 || 7));
      const thursdayDate = d.toISOString().split('T')[0];

      await expect(
        service.createBooking('student-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate: thursdayDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when slot already booked for date', async () => {
      const bookingDate = getNextWednesday();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(validSlot);
      mockPrisma.bookings.findFirst.mockResolvedValue({
        id: 'existing-booking',
        status: 'confirmed',
      });

      await expect(
        service.createBooking('student-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelBooking', () => {
    it('cancels a confirmed booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        slot_id: 'slot-1',
        booking_date: new Date(),
        start_time: '14:00',
        end_time: '16:00',
        status: 'confirmed',
        notes: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockPrisma.bookings.update.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        slot_id: 'slot-1',
        booking_date: new Date(),
        start_time: '14:00',
        end_time: '16:00',
        status: 'cancelled',
        notes: null,
        cancelled_by: 'student-1',
        cancellation_reason: 'Plus disponible',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.cancelBooking(
        'student-1',
        'booking-1',
        'Plus disponible',
      );

      expect(result.booking.status).toBe('cancelled');
      expect(mockNotifications.emitNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects cancellation by non-participant', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        status: 'confirmed',
      });

      await expect(
        service.cancelBooking('other-user', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancellation of already cancelled booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        status: 'cancelled',
      });

      await expect(
        service.cancelBooking('student-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listMyBookings', () => {
    it('returns bookings for user', async () => {
      mockPrisma.bookings.findMany.mockResolvedValue([
        {
          id: 'booking-1',
          student_id: 'student-1',
          mentor_id: 'mentor-1',
          slot_id: 'slot-1',
          booking_date: new Date('2026-03-04'),
          start_time: '14:00',
          end_time: '16:00',
          status: 'confirmed',
          notes: null,
          cancelled_by: null,
          cancellation_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          student: { id: 'student-1', first_name: 'Alice', last_name: 'Dupont' },
          mentor: { id: 'mentor-1', first_name: 'Marc', last_name: 'Martin' },
        },
      ]);

      const result = await service.listMyBookings('student-1');

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].status).toBe('confirmed');
      expect(result.bookings[0].student.firstName).toBe('Alice');
    });
  });

  describe('getBooking', () => {
    it('rejects access from non-participant', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        status: 'confirmed',
        student: { id: 'student-1', first_name: 'A', last_name: 'B' },
        mentor: { id: 'mentor-1', first_name: 'C', last_name: 'D' },
      });

      await expect(
        service.getBooking('other-user', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
