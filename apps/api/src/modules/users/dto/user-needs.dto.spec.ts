import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserNeedsDto } from './user-needs.dto';

describe('UpdateUserNeedsDto', () => {
  it('should accept valid complete dto', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {
      objectives: ['academic-writing', 'career-guidance'],
      domain: 'informatique',
      level: 'master-1',
      graduationYear: '2026',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept empty dto (all fields optional)', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept partial dto', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {
      objectives: ['stress-management'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject objectives with non-string items', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {
      objectives: [123, true],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject domain exceeding max length', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {
      domain: 'x'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject objectives array exceeding max size', async () => {
    const dto = plainToInstance(UpdateUserNeedsDto, {
      objectives: Array(11).fill('valid-objective'),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
