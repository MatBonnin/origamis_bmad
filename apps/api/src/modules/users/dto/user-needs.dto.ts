import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserNeedsDto {
  @ApiPropertyOptional({
    description: 'Liste des objectifs selectionnes',
    example: ['academic-writing', 'career-guidance'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(10)
  objectives?: string[];

  @ApiPropertyOptional({
    description: "Domaine d'etude",
    example: 'informatique',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiPropertyOptional({
    description: 'Niveau academique',
    example: 'master-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiPropertyOptional({
    description: 'Annee de diplomation prevue',
    example: '2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  graduationYear?: string;
}

export class UserNeedsResponseDto {
  @ApiProperty({ description: 'Liste des objectifs' })
  objectives: string[];

  @ApiProperty({ description: "Domaine d'etude" })
  domain: string | null;

  @ApiProperty({ description: 'Niveau academique' })
  level: string | null;

  @ApiProperty({ description: 'Annee de diplomation' })
  graduationYear: string | null;

  @ApiProperty({ description: 'Date de derniere mise a jour' })
  updatedAt: Date;
}
