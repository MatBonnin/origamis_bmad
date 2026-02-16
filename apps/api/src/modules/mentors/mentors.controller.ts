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
import { GetRecommendationsQueryDto } from './dto';

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
  constructor(private readonly matchingService: MatchingService) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'Recuperer les mentors recommandes pour un etudiant' })
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
}
