import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { UpdateUserRolesDto } from './dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs pour administration des roles' })
  @ApiResponse({ status: 200, description: 'Utilisateurs recuperes avec succes' })
  @ApiResponse({ status: 403, description: 'Acces refuse' })
  async getUsers() {
    const users = await this.adminService.listUsers();
    return { data: { users }, error: null };
  }

  @Patch(':id/roles')
  @ApiOperation({ summary: 'Assigner des roles a un utilisateur' })
  @ApiResponse({ status: 200, description: 'Roles modifies avec succes' })
  @ApiResponse({ status: 403, description: 'Acces refuse' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouve' })
  async updateUserRoles(
    @CurrentUser() currentUser: UserResponseDto,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    const user = await this.adminService.updateUserRoles(currentUser.id, id, dto.roles);
    return { data: { user }, error: null };
  }
}
