import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ALLOWED_SORTS = [
  'relevance',
  'rating_desc',
  'price_asc',
  'price_desc',
  'availability',
] as const;

export type MentorSearchSort = (typeof ALLOWED_SORTS)[number];

export class GetMentorsSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Requete de recherche libre',
    example: 'react',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Cursor de pagination (base64)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Taille de page',
    minimum: 1,
    maximum: 20,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtres JSON encodes en query string',
    example: '{"domains":["informatique"],"maxPrice":60,"minRating":4}',
  })
  @IsOptional()
  @IsString()
  filters?: string;

  @ApiPropertyOptional({
    description: 'Tri des resultats',
    enum: ALLOWED_SORTS,
    default: 'relevance',
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SORTS)
  sort?: MentorSearchSort;
}
