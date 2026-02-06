import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  const createDto = (data: Partial<UpdateProfileDto>): UpdateProfileDto => {
    return plainToInstance(UpdateProfileDto, data);
  };

  describe('firstName', () => {
    it('should pass with valid firstName', async () => {
      const dto = createDto({ firstName: 'John' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty firstName', async () => {
      const dto = createDto({ firstName: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('firstName');
    });

    it('should fail with firstName exceeding 100 chars', async () => {
      const dto = createDto({ firstName: 'a'.repeat(101) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when firstName is not provided', async () => {
      const dto = createDto({});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('lastName', () => {
    it('should pass with valid lastName', async () => {
      const dto = createDto({ lastName: 'Doe' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty lastName', async () => {
      const dto = createDto({ lastName: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('level', () => {
    it('should pass with valid level values', async () => {
      for (const level of ['debutant', 'intermediaire', 'avance']) {
        const dto = createDto({ level });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail with invalid level value', async () => {
      const dto = createDto({ level: 'expert' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when level is not provided', async () => {
      const dto = createDto({});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('objectives', () => {
    it('should pass with valid objectives array', async () => {
      const dto = createDto({
        objectives: ['Apprendre React', 'Trouver un mentor'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with empty objectives array', async () => {
      const dto = createDto({ objectives: [] });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when objective exceeds 200 chars', async () => {
      const dto = createDto({
        objectives: ['a'.repeat(201)],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when objectives is not an array', async () => {
      const dto = createDto({ objectives: 'not an array' as unknown as string[] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('bio', () => {
    it('should pass with valid bio', async () => {
      const dto = createDto({ bio: 'Développeur passionné' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with bio exceeding 500 chars', async () => {
      const dto = createDto({ bio: 'a'.repeat(501) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('avatarUrl', () => {
    it('should pass with valid avatar URL', async () => {
      const dto = createDto({ avatarUrl: 'https://example.com/avatar.jpg' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with avatarUrl exceeding 500 chars', async () => {
      const dto = createDto({ avatarUrl: 'https://example.com/' + 'a'.repeat(500) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('multiple fields', () => {
    it('should pass with all valid fields', async () => {
      const dto = createDto({
        firstName: 'John',
        lastName: 'Doe',
        level: 'intermediaire',
        objectives: ['Learn React'],
        bio: 'Developer',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
