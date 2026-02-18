import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  NotificationPreferencesResponseDto,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
  UpdateUserNeedsDto,
  UserProfileResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserResponseDto } from '../auth/dto';
import { AdminService } from '../admin';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: "Obtenir le profil complet de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/UserProfileResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getProfile(@CurrentUser() user: UserResponseDto) {
    const profile = await this.usersService.getProfile(user.id);
    return { data: profile, error: null };
  }

  @Patch('me')
  @ApiOperation({
    summary: "Mettre à jour le profil de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/UserProfileResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return { data: profile, error: null };
  }

  @Get('me/notification-preferences')
  @ApiOperation({
    summary:
      "Obtenir les préférences de notifications de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Préférences récupérées avec succès',
    schema: {
      properties: {
        data: {
          $ref: '#/components/schemas/NotificationPreferencesResponseDto',
        },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getNotificationPreferences(@CurrentUser() user: UserResponseDto) {
    const preferences = await this.usersService.getNotificationPreferences(
      user.id,
    );
    return { data: { preferences: preferences.preferences }, error: null };
  }

  @Patch('me/notification-preferences')
  @ApiOperation({
    summary:
      "Mettre à jour les préférences de notifications de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Préférences mises à jour avec succès',
    schema: {
      properties: {
        data: {
          $ref: '#/components/schemas/NotificationPreferencesResponseDto',
        },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async updateNotificationPreferences(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const preferences = await this.usersService.updateNotificationPreferences(
      user.id,
      dto,
    );
    return { data: { preferences: preferences.preferences }, error: null };
  }

  @Get('me/needs')
  @ApiOperation({ summary: "Obtenir les besoins de l'utilisateur connecté" })
  @ApiResponse({
    status: 200,
    description: 'Besoins récupérés avec succès',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/UserNeedsResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getNeeds(@CurrentUser() user: UserResponseDto) {
    const needs = await this.usersService.getNeeds(user.id);
    return { data: needs, error: null };
  }

  @Patch('me/needs')
  @ApiOperation({
    summary: "Mettre à jour les besoins de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: 'Besoins mis à jour avec succès',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/UserNeedsResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async updateNeeds(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateUserNeedsDto,
  ) {
    const needs = await this.usersService.updateNeeds(user.id, dto);
    return { data: needs, error: null };
  }

  @Get('me/consent')
  @ApiOperation({ summary: 'Obtenir le statut de consentement RGPD' })
  @ApiResponse({ status: 200, description: 'Statut du consentement récupéré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getConsent(@CurrentUser() user: UserResponseDto) {
    const consent = await this.usersService.getConsent(user.id);
    return { data: consent, error: null };
  }

  @Post('me/consent/withdraw')
  @ApiOperation({ summary: 'Retirer le consentement RGPD' })
  @ApiResponse({ status: 200, description: 'Consentement retiré avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Aucun consentement actif' })
  async withdrawConsent(@CurrentUser() user: UserResponseDto) {
    const result = await this.usersService.withdrawConsent(user.id);
    return { data: result, error: null };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Lister les comptes utilisateurs' })
  async getUsersForAdmin(
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
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier un compte utilisateur (admin)' })
  async updateUserForAdmin(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
    @Body()
    dto: { firstName?: string; lastName?: string; status?: 'active' | 'suspended' | 'deleted' },
  ) {
    const updated = await this.adminService.updateUserAccount(
      user.id,
      targetUserId,
      dto,
    );
    return { data: { user: updated }, error: null };
  }

  @Patch(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier les roles utilisateur (admin)' })
  async updateUserRolesForAdmin(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
    @Body() dto: { roles: string[] },
  ) {
    const updated = await this.adminService.updateUserRoles(
      user.id,
      targetUserId,
      dto.roles,
    );
    return { data: { user: updated }, error: null };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier le statut utilisateur (admin)' })
  async updateUserStatusForAdmin(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
    @Body() dto: { status: 'active' | 'suspended' | 'deleted' },
  ) {
    const updated = await this.adminService.updateUserStatus(
      user.id,
      targetUserId,
      dto.status,
    );
    return { data: { user: updated }, error: null };
  }

  @Post(':id/suppress')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Archiver/supprimer logiquement un utilisateur (admin)' })
  async suppressUserForAdmin(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
  ) {
    const result = await this.adminService.suppressUser(user.id, targetUserId);
    return { data: result, error: null };
  }

  @Post(':id/request-deletion')
  @ApiOperation({ summary: 'Demander la suppression de ses donnees (RGPD)' })
  async requestDeletion(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
    @Body() dto: { reason?: string; requestExport?: boolean },
  ) {
    const request = await this.usersService.requestDeletion(user, targetUserId, dto);
    return { data: { request }, error: null };
  }

  @Patch(':id/deletion-status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Mettre a jour le statut d une demande RGPD' })
  async updateDeletionStatus(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
    @Body() dto: { status: 'requested' | 'reviewed' | 'approved' | 'rejected' | 'deleted'; notes?: string },
  ) {
    const status = await this.usersService.updateDeletionStatus(
      user,
      targetUserId,
      dto,
    );
    return { data: { status }, error: null };
  }

  @Delete(':id/data')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Executer la suppression des donnees utilisateur' })
  async deleteUserData(
    @CurrentUser() user: UserResponseDto,
    @Param('id') targetUserId: string,
  ) {
    const data = await this.usersService.deleteUserData(user, targetUserId);
    return { data, error: null };
  }
}
