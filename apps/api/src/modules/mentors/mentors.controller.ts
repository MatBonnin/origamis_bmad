import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { MatchingService } from '../matching';
import {
  CreateDateOverrideDto,
  CreateMentorSelfProfileDto,
  GetAvailableSlotsQueryDto,
  GetMentorReviewsQueryDto,
  GetMentorsSearchQueryDto,
  GetRecommendationsQueryDto,
  TimeWindowDto,
  UpdateDateOverrideDto,
  UpdateGeneralAvailabilityDto,
  UpdateMentorSelfProfileDto,
  UpdateSchedulingSettingsDto,
  UpdateWeeklyScheduleDto,
} from './dto';
import { MentorsAvailabilityService } from './mentors-availability.service';
import {
  MentorValidationStatus,
  MentorVisibilityStatus,
  MentorsAdminService,
} from './mentors-admin.service';
import { MentorsProfileService } from './mentors-profile.service';
import { MentorsEpic8Service } from './mentors-epic8.service';
import {
  MentorSearchFilters,
  MentorsSearchService,
} from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';

interface ParsedFilters {
  domains?: string[];
  supportTypes?: ('ponctuel' | 'suivi_regulier' | 'long_uniquement')[];
  maxPrice?: number;
  minRating?: number;
}

type ApiEnvelope<T> = { data: T; error: null };

@ApiTags('mentors')
@Controller('mentors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MentorsController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly mentorsSearchService: MentorsSearchService,
    private readonly mentorsProfileService: MentorsProfileService,
    private readonly mentorsSelfService: MentorsSelfService,
    private readonly mentorsAvailabilityService: MentorsAvailabilityService,
    private readonly mentorsAdminService: MentorsAdminService,
    private readonly mentorsEpic8Service: MentorsEpic8Service,
  ) {}

  @Get('recommendations')
  @ApiOperation({
    summary: 'Recuperer les mentors recommandes pour un etudiant',
  })
  @ApiResponse({ status: 200, description: 'Recommandations recuperees' })
  async getRecommendations(
    @CurrentUser() user: UserResponseDto,
    @Query() query: GetRecommendationsQueryDto,
  ): Promise<ApiEnvelope<unknown>> {
    const filters = this.parseFilters(query.filters);

    const rawData = await this.matchingService.getRecommendations(user.id, {
      cursor: query.cursor,
      limit: query.limit,
      filters,
    });

    return {
      data: rawData,
      error: null,
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Rechercher des mentors avec filtres, tri et pagination',
  })
  @ApiResponse({ status: 200, description: 'Resultats de recherche recuperes' })
  async searchMentors(
    @Query() query: GetMentorsSearchQueryDto,
  ): Promise<ApiEnvelope<unknown>> {
    const filters = this.parseSearchFilters(query.filters);
    const sort = query.sort ?? 'relevance';

    const data = await this.mentorsSearchService.searchMentors({
      q: query.q,
      cursor: query.cursor,
      limit: query.limit,
      filters,
      sort,
    });

    return { data, error: null };
  }

  @Get('filters')
  @ApiOperation({ summary: 'Recuperer les facettes de filtrage mentors' })
  @ApiResponse({ status: 200, description: 'Facettes de filtres recuperees' })
  async getMentorFilterFacets(): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsSearchService.getFilterFacets();
    return { data, error: null };
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Recuperer le profil mentor du compte connecte' })
  @ApiResponse({ status: 200, description: 'Profil mentor recupere' })
  async getMyMentorProfile(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsSelfService.getMyProfile(user.id);
    return { data, error: null };
  }

  @Post('me')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Creer le profil mentor du compte connecte' })
  @ApiResponse({ status: 201, description: 'Profil mentor cree' })
  async createMyMentorProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreateMentorSelfProfileDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsSelfService.createMyProfile(user.id, dto);
    return { data, error: null };
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({
    summary: 'Mettre a jour le profil mentor du compte connecte',
  })
  @ApiResponse({ status: 200, description: 'Profil mentor mis a jour' })
  async updateMyMentorProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateMentorSelfProfileDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsSelfService.updateMyProfile(user.id, dto);
    return { data, error: null };
  }

  @Get('me/publish-readiness')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Etat de readiness de publication mentor' })
  async getMyPublishReadiness(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsSelfService.getPublishReadiness(user.id);
    return { data, error: null };
  }

  @Get('me/documents')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Lister les documents du mentor connecte' })
  async getMyDocuments(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.listMyDocuments(user.id);
    return { data, error: null };
  }

  @Post('me/documents')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Uploader un document mentor' })
  async uploadMyDocument(
    @CurrentUser() user: UserResponseDto,
    @Body() body: { type: 'diploma' | 'certificate'; fileUrl: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.uploadMyDocument(user.id, body);
    return { data, error: null };
  }

  @Delete('me/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Supprimer un document mentor' })
  async deleteMyDocument(
    @CurrentUser() user: UserResponseDto,
    @Param('docId') docId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.deleteMyDocument(
      user.id,
      docId,
    );
    return { data, error: null };
  }

  @Post('me/calendar/google/connect')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Connecter Google Calendar' })
  async connectGoogleCalendar(
    @CurrentUser() user: UserResponseDto,
    @Body() body: { authCode?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.connectGoogleCalendar(
      user.id,
      body.authCode,
    );
    return { data, error: null };
  }

  @Delete('me/calendar/google/disconnect')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Deconnecter Google Calendar' })
  async disconnectGoogleCalendar(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.disconnectGoogleCalendar(
      user.id,
    );
    return { data, error: null };
  }

  @Post('me/calendar/google/sync')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Synchroniser Google Calendar' })
  async syncGoogleCalendar(
    @CurrentUser() user: UserResponseDto,
    @Body()
    body: {
      busySlots?: Array<{
        startAt: string;
        endAt: string;
        providerEventId?: string;
      }>;
    },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.syncGoogleCalendar(
      user.id,
      body,
    );
    return { data, error: null };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVAILABILITY ENDPOINTS (V2 - New system)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('me/availability')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Recuperer toutes les disponibilites du mentor' })
  @ApiResponse({ status: 200, description: 'Disponibilites completes' })
  async getMyAvailability(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.getMyAvailability(
      user.id,
    );
    return { data, error: null };
  }

  @Patch('me/availability/general')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Activer/desactiver les reservations' })
  @ApiResponse({ status: 200, description: 'Statut mis a jour' })
  async updateGeneralAvailability(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateGeneralAvailabilityDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data =
      await this.mentorsAvailabilityService.updateGeneralAvailability(
        user.id,
        dto,
      );
    return { data, error: null };
  }

  @Patch('me/availability/settings')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Mettre a jour les parametres de scheduling' })
  @ApiResponse({ status: 200, description: 'Parametres mis a jour' })
  async updateSchedulingSettings(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateSchedulingSettingsDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.updateSchedulingSettings(
      user.id,
      dto,
    );
    return { data, error: null };
  }

  @Put('me/availability/schedule')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Definir le planning hebdomadaire complet' })
  @ApiResponse({ status: 200, description: 'Planning mis a jour' })
  async updateWeeklySchedule(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateWeeklyScheduleDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.updateWeeklySchedule(
      user.id,
      dto.schedule,
    );
    return { data, error: null };
  }

  @Patch('me/availability/schedule/:dayOfWeek')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: "Modifier le planning d'un jour specifique" })
  @ApiResponse({ status: 200, description: 'Jour mis a jour' })
  async updateSingleDaySchedule(
    @CurrentUser() user: UserResponseDto,
    @Param('dayOfWeek') dayOfWeek: string,
    @Body() dto: { isAvailable: boolean; timeWindows: TimeWindowDto[] },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.updateSingleDaySchedule(
      user.id,
      parseInt(dayOfWeek, 10),
      dto.isAvailable,
      dto.timeWindows,
    );
    return { data, error: null };
  }

  // ── Date Overrides (Exceptions) ──

  @Get('me/availability/overrides')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Lister les exceptions de dates' })
  @ApiResponse({ status: 200, description: 'Liste des exceptions' })
  async listDateOverrides(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.listDateOverrides(
      user.id,
    );
    return { data, error: null };
  }

  @Post('me/availability/overrides')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Creer une exception de date' })
  @ApiResponse({ status: 201, description: 'Exception creee' })
  async createDateOverride(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreateDateOverrideDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.createDateOverride(
      user.id,
      dto,
    );
    return { data, error: null };
  }

  @Patch('me/availability/overrides/:overrideId')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Modifier une exception de date' })
  @ApiResponse({ status: 200, description: 'Exception modifiee' })
  async updateDateOverride(
    @CurrentUser() user: UserResponseDto,
    @Param('overrideId') overrideId: string,
    @Body() dto: UpdateDateOverrideDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.updateDateOverride(
      user.id,
      overrideId,
      dto,
    );
    return { data, error: null };
  }

  @Delete('me/availability/overrides/:overrideId')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Supprimer une exception de date' })
  @ApiResponse({ status: 200, description: 'Exception supprimee' })
  async deleteDateOverride(
    @CurrentUser() user: UserResponseDto,
    @Param('overrideId') overrideId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.deleteDateOverride(
      user.id,
      overrideId,
    );
    return { data, error: null };
  }

  // ── Public Availability (for students) ──

  @Get(':id/slots')
  @ApiOperation({ summary: "Obtenir les creneaux disponibles d'un mentor" })
  @ApiResponse({ status: 200, description: 'Creneaux disponibles' })
  async getMentorAvailableSlots(
    @Param('id') mentorId: string,
    @Query() query: GetAvailableSlotsQueryDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.getAvailableSlots(
      mentorId,
      query.startDate,
      query.endDate,
    );
    return { data, error: null };
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Recuperer les disponibilites d un mentor (legacy)',
  })
  @ApiResponse({ status: 200, description: 'Disponibilites recuperees' })
  async getMentorAvailability(
    @Param('id') mentorId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data =
      await this.mentorsAvailabilityService.getMentorAvailability(mentorId);
    return { data, error: null };
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Recuperer les mentors en attente de validation' })
  async getPendingMentors(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAdminService.getPendingMentors(user);
    return { data, error: null };
  }

  @Get('visibility')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Recuperer les regles de visibilite des mentors' })
  async getMentorVisibility(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAdminService.getVisibility(user);
    return { data, error: null };
  }

  @Get(':id/documents')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Lister les documents d un mentor (admin)' })
  async getMentorDocuments(
    @Param('id') mentorId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data =
      await this.mentorsEpic8Service.getMentorDocumentsForAdmin(mentorId);
    return { data, error: null };
  }

  @Patch(':id/documents/:docId/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Mettre a jour le statut d un document mentor' })
  async patchMentorDocumentStatus(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Param('docId') docId: string,
    @Body() body: { status: 'pending' | 'verified' | 'rejected' },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsEpic8Service.updateMentorDocumentStatus(
      user.id,
      mentorId,
      docId,
      body.status,
    );
    return { data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer le profil mentor detaille' })
  @ApiResponse({ status: 200, description: 'Profil mentor recupere' })
  async getMentorProfile(
    @Param('id') mentorId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsProfileService.getMentorProfile(mentorId);
    return { data, error: null };
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Recuperer les avis d un mentor avec pagination',
  })
  @ApiResponse({ status: 200, description: 'Avis mentor recuperes' })
  async getMentorReviews(
    @Param('id') mentorId: string,
    @Query() query: GetMentorReviewsQueryDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsProfileService.getMentorReviews(mentorId, {
      page: query.page,
      limit: query.limit,
    });
    return { data, error: null };
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Publier un avis sur un mentor' })
  async createMentorReview(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Body() body: { rating: number; body: string; bookingId?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsProfileService.createMentorReview(mentorId, {
      studentId: user.id,
      bookingId: body.bookingId,
      rating: body.rating,
      body: body.body,
    });
    return { data, error: null };
  }

  @Patch(':id/reviews/:reviewId')
  @ApiOperation({ summary: 'Editer un avis sur un mentor' })
  async updateMentorReview(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: { rating?: number; body?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsProfileService.updateMentorReview(
      mentorId,
      reviewId,
      {
        studentId: user.id,
        rating: body.rating,
        body: body.body,
      },
    );
    return { data, error: null };
  }

  @Delete(':id/reviews/:reviewId')
  @ApiOperation({ summary: 'Supprimer un avis sur un mentor' })
  async deleteMentorReview(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Param('reviewId') reviewId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsProfileService.deleteMentorReview(
      mentorId,
      reviewId,
      user.id,
    );
    return { data, error: null };
  }

  @Post(':id/validate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Valider un mentor' })
  async validateMentor(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Body() body: { notes?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAdminService.validateMentor(
      user,
      mentorId,
      body.notes,
    );
    return { data, error: null };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Mettre a jour le statut de validation mentor' })
  async patchMentorStatus(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Body() body: { status: MentorValidationStatus; notes?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAdminService.updateMentorStatus(
      user,
      mentorId,
      body.status,
      body.notes,
    );
    return { data, error: null };
  }

  @Patch(':id/visibility')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Mettre a jour la visibilite d un mentor' })
  async patchMentorVisibility(
    @CurrentUser() user: UserResponseDto,
    @Param('id') mentorId: string,
    @Body()
    body: {
      status: MentorVisibilityStatus;
      effectiveFrom?: string;
      notes?: string;
    },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAdminService.updateVisibility(
      user,
      mentorId,
      body,
    );
    return { data, error: null };
  }

  private parseFilters(filters?: string): ParsedFilters {
    if (!filters) {
      return {};
    }

    try {
      const parsed = JSON.parse(filters) as Record<string, unknown>;
      const next: ParsedFilters = {};

      if (Array.isArray(parsed.domains)) {
        next.domains = parsed.domains.filter(
          (item): item is string => typeof item === 'string',
        );
      }

      if (Array.isArray(parsed.supportTypes)) {
        next.supportTypes = parsed.supportTypes.filter(
          (item): item is 'ponctuel' | 'suivi_regulier' | 'long_uniquement' =>
            item === 'ponctuel' ||
            item === 'suivi_regulier' ||
            item === 'long_uniquement',
        );
      }

      if (typeof parsed.maxPrice === 'number') {
        next.maxPrice = parsed.maxPrice;
      }

      if (typeof parsed.minRating === 'number') {
        next.minRating = parsed.minRating;
      }

      return next;
    } catch {
      throw new BadRequestException({
        code: 'INVALID_FILTERS',
        message: 'Le parametre filters doit etre un JSON valide',
      });
    }
  }

  private parseSearchFilters(filters?: string): MentorSearchFilters {
    if (!filters) {
      return {};
    }

    try {
      const parsed = JSON.parse(filters) as Record<string, unknown>;
      const next: MentorSearchFilters = {};

      if (Array.isArray(parsed.domains)) {
        next.domains = parsed.domains.filter(
          (item): item is string => typeof item === 'string',
        );
      }

      if (typeof parsed.minPrice === 'number') {
        next.minPrice = parsed.minPrice;
      }

      if (typeof parsed.maxPrice === 'number') {
        next.maxPrice = parsed.maxPrice;
      }

      if (typeof parsed.minRating === 'number') {
        next.minRating = parsed.minRating;
      }

      if (
        parsed.availability === 'available' ||
        parsed.availability === 'all'
      ) {
        next.availability = parsed.availability;
      }

      return next;
    } catch {
      throw new BadRequestException({
        code: 'INVALID_SEARCH_FILTERS',
        message: 'Le parametre filters doit etre un JSON valide',
      });
    }
  }
}
