import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: AdminService;

  const mockAdminService = {
    listUsers: jest.fn(),
    updateUserRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('getUsers should return data envelope', async () => {
    const users = [{ id: 'u1', roles: ['mentor'] }];
    mockAdminService.listUsers.mockResolvedValue(users);

    const result = await controller.getUsers();

    expect(result).toEqual({ data: { users }, error: null });
    expect(adminService.listUsers).toHaveBeenCalledTimes(1);
  });

  it('updateUserRoles should return data envelope', async () => {
    const currentUser = { id: 'admin-1' } as never;
    const user = { id: 'u2', roles: ['support'] };
    mockAdminService.updateUserRoles.mockResolvedValue(user);

    const result = await controller.updateUserRoles(currentUser, 'u2', {
      roles: ['support'],
    });

    expect(result).toEqual({ data: { user }, error: null });
    expect(adminService.updateUserRoles).toHaveBeenCalledWith('admin-1', 'u2', [
      'support',
    ]);
  });
});
