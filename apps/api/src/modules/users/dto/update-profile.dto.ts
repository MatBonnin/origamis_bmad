import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'intermediaire',
    enum: ['debutant', 'intermediaire', 'avance'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['debutant', 'intermediaire', 'avance'], {
    message: 'Le niveau doit être debutant, intermediaire ou avance',
  })
  level?: string;

  @ApiPropertyOptional({
    example: ['Apprendre le développement web', 'Trouver un mentor'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Les objectifs doivent être une liste' })
  @IsString({ each: true, message: 'Chaque objectif doit être une chaîne' })
  @MaxLength(200, { each: true, message: 'Chaque objectif ne peut pas dépasser 200 caractères' })
  objectives?: string[];

  @ApiPropertyOptional({
    example: 'Étudiant passionné par le développement web',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La bio ne peut pas dépasser 500 caractères' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "L'URL de l'avatar ne peut pas dépasser 500 caractères" })
  avatarUrl?: string;
}
