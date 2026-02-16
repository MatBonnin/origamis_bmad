import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserRolesDto } from './update-user-roles.dto';

describe('UpdateUserRolesDto', () => {
  it('should validate with allowed roles', async () => {
    const dto = plainToInstance(UpdateUserRolesDto, {
      roles: ['admin', 'support'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with empty roles', async () => {
    const dto = plainToInstance(UpdateUserRolesDto, { roles: [] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid role', async () => {
    const dto = plainToInstance(UpdateUserRolesDto, { roles: ['owner'] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
