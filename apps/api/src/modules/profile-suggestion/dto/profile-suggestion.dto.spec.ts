import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ModifySuggestionDto } from './profile-suggestion.dto';

describe('ModifySuggestionDto', () => {
  it('should pass with valid level', async () => {
    const dto = plainToInstance(ModifySuggestionDto, { level: 'avance' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid objectives', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {
      objectives: ['career-guidance', 'networking'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid bio', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {
      bio: 'Ma bio personnalisee',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass when all fields are provided', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {
      level: 'intermediaire',
      objectives: ['stress-management'],
      bio: 'Bio complete',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass when no fields are provided', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if level is not a string', async () => {
    const dto = plainToInstance(ModifySuggestionDto, { level: 123 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if objectives is not an array of strings', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {
      objectives: [123, 456],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if bio exceeds 500 characters', async () => {
    const dto = plainToInstance(ModifySuggestionDto, {
      bio: 'x'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
