import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const createContext = (user?: { roles?: string[] }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow when no roles are required', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ roles: ['etudiant'] }))).toBe(
      true,
    );
  });

  it('should throw FORBIDDEN when user has no required role', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['admin']);
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(createContext({ roles: ['mentor'] })),
    ).toThrow(ForbiddenException);
  });

  it('should allow when user has one of required roles', () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue(['admin', 'support']);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ roles: ['support'] }))).toBe(true);
  });
});
