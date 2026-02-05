import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';
import { MailService } from '../mail';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    roles: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'etudiant' as const,
    };

    const mockRole = { id: 'role-1', name: 'etudiant' };
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date(),
      user_roles: [{ role: { name: 'etudiant' } }],
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.roles.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.users.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.roles).toContain('etudiant');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create role if it does not exist', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.roles.findUnique.mockResolvedValue(null);
      mockPrismaService.roles.create.mockResolvedValue(mockRole);
      mockPrismaService.users.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(registerDto);

      expect(mockPrismaService.roles.create).toHaveBeenCalledWith({
        data: { name: 'etudiant' },
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date(),
      user_roles: [{ role: { name: 'etudiant' } }],
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMe', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date(),
      user_roles: [{ role: { name: 'etudiant' } }],
    };

    it('should return user profile', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('should return ok:true even if user does not exist (anti-enumeration)', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.users.update).not.toHaveBeenCalled();
    });

    it('should generate token, update user and send email if email exists', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', first_name: 'John' };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUser);
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          password_reset_token_hash: expect.any(String),
          password_reset_expires_at: expect.any(Date),
          password_reset_used_at: null,
        }),
      });
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'John',
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-token',
      password: 'NewPassword123!',
    };

    it('should throw BadRequestException if token is invalid', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      mockPrismaService.users.findFirst.mockResolvedValue({
        id: 'user-1',
        password_reset_expires_at: expiredDate,
        password_reset_used_at: null,
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token was already used', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue({
        id: 'user-1',
        password_reset_expires_at: new Date(Date.now() + 3600000),
        password_reset_used_at: new Date(),
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset password successfully with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        password_reset_expires_at: new Date(Date.now() + 3600000),
        password_reset_used_at: null,
      };
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password_hash: 'new-hashed-password',
          password_reset_used_at: expect.any(Date),
        },
      });
    });
  });
});
