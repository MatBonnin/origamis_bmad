import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProfileSuggestionResponseDto {
  @ApiProperty({ example: 'intermediaire' })
  level: string;

  @ApiProperty({ example: ['career-guidance', 'time-management'] })
  objectives: string[];

  @ApiProperty({ example: 'Etudiant(e) en informatique...' })
  bio: string;
}

export class ModifySuggestionDto {
  @ApiPropertyOptional({ example: 'avance' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: ['networking', 'stress-management'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ example: 'Ma bio personnalisee' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
