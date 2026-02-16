import {
  BadRequestException,
  Body,
  Controller,
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
  ) {}

  @Get('recommendations')
  @ApiOperation({
    summary: 'Recuperer les mentors recommandes pour un etudiant',
  })
  @ApiResponse({ status: 200, description: 'Recommandations recuperees' })
  async getRecommendations(
    @CurrentUser() user: UserResponseDto,
    @Query() query: GetRecommendationsQueryDto,
  ) {
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
  async searchMentors(@Query() query: GetMentorsSearchQueryDto) {
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
  async getMentorFilterFacets() {
    const data = await this.mentorsSearchService.getFilterFacets();
    return { data, error: null };
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Recuperer le profil mentor du compte connecte' })
  @ApiResponse({ status: 200, description: 'Profil mentor recupere' })
  async getMyMentorProfile(@CurrentUser() user: UserResponseDto) {
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
  ) {
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
  ) {
    const data = await this.mentorsSelfService.updateMyProfile(user.id, dto);
    return { data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer le profil mentor detaille' })
  @ApiResponse({ status: 200, description: 'Profil mentor recupere' })
  async getMentorProfile(@Param('id') mentorId: string) {
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
  ) {
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
