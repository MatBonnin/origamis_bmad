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
    booking_sessions: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
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
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
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

  // A future date far enough for notice policy to pass
  const getFutureBookingDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks ahead
    // Adjust to Wednesday
    d.setDate(d.getDate() + ((3 + 7 - d.getDay()) % 7 || 7));
    return d;
  };

  const makeFutureBooking = (overrides: Record<string, unknown> = {}) => {
    const futureDate = getFutureBookingDate();
    return {
      id: 'booking-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
      slot_id: 'slot-1',
      booking_date: futureDate,
      start_time: '14:00',
      end_time: '16:00',
      status: 'confirmed',
      notes: null,
      cancelled_by: null,
      cancellation_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  };

  describe('createBooking', () => {
    it('creates a pending booking with payment required', async () => {
      const bookingDate = getNextWednesday();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        validSlot,
      );
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.create.mockResolvedValue({
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        slot_id: 'slot-1',
        booking_date: new Date(bookingDate),
        start_time: '14:00',
        end_time: '16:00',
        status: 'pending',
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
      expect(result.booking.status).toBe('pending');
      expect(result.paymentRequired).toBe(true);
      expect(result.bookingId).toBe('booking-1');
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
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        validSlot,
      );

      await expect(
        service.createBooking('mentor-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate: getNextWednesday(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when day of week does not match slot', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        validSlot,
      );

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

    it('rejects invalid date format', async () => {
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        validSlot,
      );

      await expect(
        service.createBooking('student-1', {
          mentorId: 'mentor-1',
          slotId: 'slot-1',
          bookingDate: '2026-2-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when slot already booked for date', async () => {
      const bookingDate = getNextWednesday();
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        validSlot,
      );
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
    it('cancels a confirmed booking with sufficient notice', async () => {
      const futureBooking = makeFutureBooking();
      mockPrisma.bookings.findUnique.mockResolvedValue(futureBooking);
      mockPrisma.bookings.update.mockResolvedValue({
        ...futureBooking,
        status: 'cancelled',
        cancelled_by: 'student-1',
        cancellation_reason: 'Plus disponible',
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
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());

      await expect(
        service.cancelBooking('other-user', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancellation of already cancelled booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeFutureBooking({ status: 'cancelled' }),
      );

      await expect(
        service.cancelBooking('student-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancellation within notice period (< 4h)', async () => {
      // Booking starting in 1 hour
      const soonDate = new Date();
      soonDate.setMinutes(soonDate.getMinutes() + 60);
      const startTime = `${String(soonDate.getHours()).padStart(2, '0')}:${String(soonDate.getMinutes()).padStart(2, '0')}`;

      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeFutureBooking({
          booking_date: soonDate,
          start_time: startTime,
          status: 'confirmed',
        }),
      );

      await expect(
        service.cancelBooking('student-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rescheduleBooking', () => {
    const newSlot = {
      id: 'slot-2',
      availability_id: 'avail-1',
      day_of_week: 4, // Thursday
      start_time: '10:00',
      end_time: '12:00',
      is_recurring: true,
      status: 'published',
      availability: {
        id: 'avail-1',
        mentor_user_id: 'mentor-1',
        is_available: true,
        timezone: 'Europe/Paris',
      },
    };

    const getNextThursday = () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      d.setDate(d.getDate() + ((4 + 7 - d.getDay()) % 7 || 7));
      return d.toISOString().split('T')[0];
    };

    it('reschedules a booking to a new slot and date', async () => {
      const newDate = getNextThursday();
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        newSlot,
      );
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.update.mockResolvedValue({
        ...makeFutureBooking(),
        slot_id: 'slot-2',
        booking_date: new Date(newDate),
        start_time: '10:00',
        end_time: '12:00',
      });

      const result = await service.rescheduleBooking('student-1', 'booking-1', {
        newSlotId: 'slot-2',
        newBookingDate: newDate,
        reason: 'Conflit agenda',
      });

      expect(result.booking.slotId).toBe('slot-2');
      expect(result.booking.startTime).toBe('10:00');
      expect(mockNotifications.emitNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects reschedule by non-participant', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());

      await expect(
        service.rescheduleBooking('other-user', 'booking-1', {
          newSlotId: 'slot-2',
          newBookingDate: getNextThursday(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects reschedule of cancelled booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeFutureBooking({ status: 'cancelled' }),
      );

      await expect(
        service.rescheduleBooking('student-1', 'booking-1', {
          newSlotId: 'slot-2',
          newBookingDate: getNextThursday(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reschedule when new slot already booked', async () => {
      const newDate = getNextThursday();
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue(
        newSlot,
      );
      mockPrisma.bookings.findFirst.mockResolvedValue({
        id: 'other-booking',
        status: 'confirmed',
      });

      await expect(
        service.rescheduleBooking('student-1', 'booking-1', {
          newSlotId: 'slot-2',
          newBookingDate: newDate,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects reschedule when new slot belongs to another mentor', async () => {
      const newDate = getNextThursday();
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue({
        ...newSlot,
        availability: {
          ...newSlot.availability,
          mentor_user_id: 'mentor-2',
        },
      });

      await expect(
        service.rescheduleBooking('student-1', 'booking-1', {
          newSlotId: 'slot-2',
          newBookingDate: newDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reschedule when mentor is unavailable', async () => {
      const newDate = getNextThursday();
      mockPrisma.bookings.findUnique.mockResolvedValue(makeFutureBooking());
      mockPrisma.mentor_availability_slots.findUnique.mockResolvedValue({
        ...newSlot,
        availability: {
          ...newSlot.availability,
          is_available: false,
        },
      });

      await expect(
        service.rescheduleBooking('student-1', 'booking-1', {
          newSlotId: 'slot-2',
          newBookingDate: newDate,
        }),
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
          student: {
            id: 'student-1',
            first_name: 'Alice',
            last_name: 'Dupont',
          },
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

  describe('getSessionLink', () => {
    const makeConfirmedBooking = (overrides: Record<string, unknown> = {}) => {
      const futureDate = getFutureBookingDate();
      return {
        id: 'booking-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        slot_id: 'slot-1',
        booking_date: futureDate,
        start_time: '14:00',
        end_time: '16:00',
        status: 'confirmed',
        notes: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        session: null,
        ...overrides,
      };
    };

    it('generates a new session link for confirmed booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(makeConfirmedBooking());
      mockPrisma.booking_sessions.create.mockResolvedValue({});

      const result = await service.getSessionLink('student-1', 'booking-1');

      expect(result.sessionUrl).toMatch(/^\/session\/.+/);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(mockPrisma.booking_sessions.create).toHaveBeenCalledTimes(1);
    });

    it('returns existing valid session link', async () => {
      const futureExpiry = new Date();
      futureExpiry.setHours(futureExpiry.getHours() + 24);

      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeConfirmedBooking({
          session: {
            id: 'session-1',
            session_token: 'existing-token',
            session_url: '/session/existing-token',
            expires_at: futureExpiry,
          },
        }),
      );

      const result = await service.getSessionLink('student-1', 'booking-1');

      expect(result.sessionUrl).toBe('/session/existing-token');
      expect(result.token).toBe('existing-token');
      expect(mockPrisma.booking_sessions.create).not.toHaveBeenCalled();
    });

    it('regenerates expired session link', async () => {
      const pastExpiry = new Date();
      pastExpiry.setHours(pastExpiry.getHours() - 1);

      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeConfirmedBooking({
          session: {
            id: 'session-1',
            session_token: 'old-token',
            session_url: '/session/old-token',
            expires_at: pastExpiry,
          },
        }),
      );
      mockPrisma.booking_sessions.update.mockResolvedValue({});

      const result = await service.getSessionLink('student-1', 'booking-1');

      expect(result.token).not.toBe('old-token');
      expect(mockPrisma.booking_sessions.update).toHaveBeenCalledTimes(1);
    });

    it('rejects non-participant', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(makeConfirmedBooking());

      await expect(
        service.getSessionLink('other-user', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects non-confirmed booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeConfirmedBooking({ status: 'pending' }),
      );

      await expect(
        service.getSessionLink('student-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancelled booking', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(
        makeConfirmedBooking({ status: 'cancelled' }),
      );

      await expect(
        service.getSessionLink('student-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
