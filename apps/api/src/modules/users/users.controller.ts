import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../auth/dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
