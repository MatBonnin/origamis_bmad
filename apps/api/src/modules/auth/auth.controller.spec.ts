import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'etudiant',
    };

    const mockAuthResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['etudiant'],
        createdAt: new Date(),
      },
      token: 'jwt-token',
    };

    it('should register a user and return wrapped response', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual({ data: mockAuthResponse, error: null });
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
    };

    const mockAuthResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['etudiant'],
        createdAt: new Date(),
      },
      token: 'jwt-token',
    };

    it('should login and return wrapped response', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual({ data: mockAuthResponse, error: null });
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getMe', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['etudiant'],
      createdAt: new Date(),
    };

    it('should return current user wrapped response', async () => {
      const result = await controller.getMe(mockUser);

      expect(result).toEqual({ data: mockUser, error: null });
    });
  });
});
