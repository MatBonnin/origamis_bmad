import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  const createDto = (data: Partial<LoginDto>): LoginDto => {
    return plainToInstance(LoginDto, {
      email: 'valid@example.com',
      password: 'password123',
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
      const dto = createDto({ password: 'anypassword' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'password')).toHaveLength(0);
    });

    it('should fail with empty password', async () => {
      const dto = createDto({ password: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });
});
