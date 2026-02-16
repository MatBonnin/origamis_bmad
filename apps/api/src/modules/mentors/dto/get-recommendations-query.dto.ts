import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetRecommendationsQueryDto {
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
    example: '{"domains":["informatique"],"maxPrice":50}',
  })
  @IsOptional()
  @IsString()
  filters?: string;
}
