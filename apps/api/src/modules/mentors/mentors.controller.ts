import {
  BadRequestException,
  Controller,
  Get,
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
import { JwtAuthGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { MatchingService } from '../matching';
import { GetMentorsSearchQueryDto, GetRecommendationsQueryDto } from './dto';
import {
  MentorSearchFilters,
  MentorsSearchService,
} from './mentors-search.service';

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
