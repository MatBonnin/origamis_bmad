import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  @ApiOperation({
    summary: 'Lister les utilisateurs pour administration des roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateurs recuperes avec succes',
  })
  @ApiResponse({ status: 403, description: 'Acces refuse' })
  async getUsers(
    @Query('role') role?: string,
    @Query('status') status?: 'active' | 'suspended' | 'deleted' | 'all',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit);
    const data = await this.adminService.listUsers({
      role,
      status,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return { data, error: null };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre a jour un compte utilisateur' })
  async updateUser(
    @CurrentUser() currentUser: UserResponseDto,
    @Param('id') id: string,
    @Body()
    dto: {
      firstName?: string;
      lastName?: string;
      status?: 'active' | 'suspended' | 'deleted';
    },
  ) {
    const user = await this.adminService.updateUserAccount(
      currentUser.id,
      id,
      dto,
    );
    return { data: { user }, error: null };
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
    const user = await this.adminService.updateUserRoles(
      currentUser.id,
      id,
      dto.roles,
    );
    return { data: { user }, error: null };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Modifier le statut d un utilisateur' })
  async updateUserStatus(
    @CurrentUser() currentUser: UserResponseDto,
    @Param('id') id: string,
    @Body() dto: { status: 'active' | 'suspended' | 'deleted' },
  ) {
    const user = await this.adminService.updateUserStatus(
      currentUser.id,
      id,
      dto.status,
    );
    return { data: { user }, error: null };
  }
}
