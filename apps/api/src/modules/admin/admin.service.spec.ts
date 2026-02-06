import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    users: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roles: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user_roles: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        user_roles: mockPrismaService.user_roles,
      }),
    );
  });

  it('listUsers should map prisma users to API contract', async () => {
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'user@example.com',
        first_name: 'User',
        last_name: 'One',
        created_at: new Date('2026-01-01'),
        user_roles: [{ role: { name: 'mentor' } }],
      },
    ]);

    const result = await service.listUsers();

    expect(result).toEqual([
      {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'One',
        roles: ['mentor'],
        createdAt: new Date('2026-01-01'),
      },
    ]);
  });

  it('updateUserRoles should reject self role modification', async () => {
    await expect(service.updateUserRoles('u1', 'u1', ['admin'])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('updateUserRoles should throw when target user does not exist', async () => {
    mockPrismaService.users.findUnique.mockResolvedValueOnce(null);

    await expect(service.updateUserRoles('admin-1', 'u2', ['mentor'])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateUserRoles should assign new role set and return updated user', async () => {
    mockPrismaService.users.findUnique
      .mockResolvedValueOnce({ id: 'u2' })
      .mockResolvedValueOnce({
        id: 'u2',
        email: 'u2@example.com',
        first_name: 'User',
        last_name: 'Two',
        created_at: new Date('2026-01-02'),
        user_roles: [{ role: { name: 'support' } }, { role: { name: 'mentor' } }],
      });

    mockPrismaService.roles.findMany.mockResolvedValue([
      { id: 'r-mentor', name: 'mentor' },
      { id: 'r-support', name: 'support' },
    ]);

    const result = await service.updateUserRoles('admin-1', 'u2', ['mentor', 'support']);

    expect(mockPrismaService.user_roles.deleteMany).toHaveBeenCalledWith({ where: { user_id: 'u2' } });
    expect(mockPrismaService.user_roles.createMany).toHaveBeenCalledWith({
      data: [
        { user_id: 'u2', role_id: 'r-mentor' },
        { user_id: 'u2', role_id: 'r-support' },
      ],
    });
    expect(result.roles).toEqual(['support', 'mentor']);
  });
});
