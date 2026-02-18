import {
  BadRequestException,
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
  CreateMentorSelfProfileDto,
  GetMentorReviewsQueryDto,
  GetMentorsSearchQueryDto,
  GetRecommendationsQueryDto,
  UpdateMentorSelfProfileDto,
} from './dto';
import { MentorsAvailabilityService } from './mentors-availability.service';
import { MentorsProfileService } from './mentors-profile.service';
import {
  MentorSearchFilters,
  MentorsSearchService,
} from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';

interface ParsedFilters {
  domains?: string[];
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

    const data = await this.matchingService.getRecommendations(user.id, {
      cursor: query.cursor,
      limit: query.limit,
      filters,
    });

    return { data, error: null };
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

  // ── Availability endpoints ──

  @Get('me/availability')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Recuperer les disponibilites du mentor connecte' })
  @ApiResponse({ status: 200, description: 'Disponibilites recuperees' })
  async getMyAvailability(
    @CurrentUser() user: UserResponseDto,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.getMyAvailability(
      user.id,
    );
    return { data, error: null };
  }

  @Post('me/availability')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Ajouter un creneau de disponibilite' })
  @ApiResponse({ status: 201, description: 'Creneau cree' })
  async createAvailabilitySlot(
    @CurrentUser() user: UserResponseDto,
    @Body()
    dto: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring?: boolean;
      status?: string;
    },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.createSlot(user.id, dto);
    return { data, error: null };
  }

  @Patch('me/availability/general')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Mettre a jour la disponibilite generale' })
  @ApiResponse({ status: 200, description: 'Disponibilite mise a jour' })
  async updateGeneralAvailability(
    @CurrentUser() user: UserResponseDto,
    @Body()
    dto: { isAvailable?: boolean; nextAvailableAt?: string; timezone?: string },
  ): Promise<ApiEnvelope<unknown>> {
    const data =
      await this.mentorsAvailabilityService.updateGeneralAvailability(
        user.id,
        dto,
      );
    return { data, error: null };
  }

  @Patch('me/availability/:slotId')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Modifier un creneau de disponibilite' })
  @ApiResponse({ status: 200, description: 'Creneau modifie' })
  async updateAvailabilitySlot(
    @CurrentUser() user: UserResponseDto,
    @Param('slotId') slotId: string,
    @Body()
    dto: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      isRecurring?: boolean;
      status?: string;
    },
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.updateSlot(
      user.id,
      slotId,
      dto,
    );
    return { data, error: null };
  }

  @Delete('me/availability/:slotId')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Supprimer un creneau de disponibilite' })
  @ApiResponse({ status: 200, description: 'Creneau supprime' })
  async deleteAvailabilitySlot(
    @CurrentUser() user: UserResponseDto,
    @Param('slotId') slotId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data = await this.mentorsAvailabilityService.deleteSlot(
      user.id,
      slotId,
    );
    return { data, error: null };
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Recuperer les disponibilites d un mentor (etudiant)',
  })
  @ApiResponse({ status: 200, description: 'Disponibilites recuperees' })
  async getMentorAvailability(
    @Param('id') mentorId: string,
  ): Promise<ApiEnvelope<unknown>> {
    const data =
      await this.mentorsAvailabilityService.getMentorAvailability(mentorId);
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
