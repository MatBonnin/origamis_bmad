import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const createDto = (data: Partial<RegisterDto>): RegisterDto => {
    return plainToInstance(RegisterDto, {
      email: 'valid@example.com',
      password: 'SecureP@ss123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'etudiant',
      consentGiven: true,
      ...data,
    });
  };

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      const dto = createDto({ email: 'test@example.com' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'email')).toHaveLength(0);
    });

    it('should fail with invalid email format', async () => {
      const dto = createDto({ email: 'invalid-email' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail with empty email', async () => {
      const dto = createDto({ email: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      const dto = createDto({ password: 'SecureP@ss123' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'password')).toHaveLength(0);
    });

    it('should fail with password less than 8 characters', async () => {
      const dto = createDto({ password: 'Short1' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail without uppercase letter', async () => {
      const dto = createDto({ password: 'lowercase123' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail without lowercase letter', async () => {
      const dto = createDto({ password: 'UPPERCASE123' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail without number', async () => {
      const dto = createDto({ password: 'NoNumberHere' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });

  describe('firstName validation', () => {
    it('should pass with valid firstName', async () => {
      const dto = createDto({ firstName: 'John' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'firstName')).toHaveLength(0);
    });

    it('should fail with empty firstName', async () => {
      const dto = createDto({ firstName: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'firstName')).toBe(true);
    });
  });

  describe('lastName validation', () => {
    it('should pass with valid lastName', async () => {
      const dto = createDto({ lastName: 'Doe' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'lastName')).toHaveLength(0);
    });

    it('should fail with empty lastName', async () => {
      const dto = createDto({ lastName: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'lastName')).toBe(true);
    });
  });

  describe('consentGiven validation', () => {
    it('should pass with consentGiven true', async () => {
      const dto = createDto({ consentGiven: true });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'consentGiven')).toHaveLength(
        0,
      );
    });

    it('should fail with consentGiven false', async () => {
      const dto = createDto({ consentGiven: false });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'consentGiven')).toBe(true);
    });

    it('should fail without consentGiven', async () => {
      const dto = createDto({});
      delete (dto as unknown as { consentGiven?: boolean }).consentGiven;
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'consentGiven')).toBe(true);
    });
  });

  describe('role validation', () => {
    it('should pass with etudiant role', async () => {
      const dto = createDto({ role: 'etudiant' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'role')).toHaveLength(0);
    });

    it('should pass with mentor role', async () => {
      const dto = createDto({ role: 'mentor' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'role')).toHaveLength(0);
    });

    it('should fail with invalid role', async () => {
      const dto = createDto({ role: 'admin' as 'etudiant' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'role')).toBe(true);
    });
  });
});
