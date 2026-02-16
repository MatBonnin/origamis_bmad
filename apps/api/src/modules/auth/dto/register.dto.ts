import {
  IsEmail,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsOptional,
  IsArray,
  ValidateNested,
  Equals,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingDataDto {
  @ApiPropertyOptional({ example: 'informatique' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ example: 'master-1' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: '2025' })
  @IsOptional()
  @IsString()
  graduationYear?: string;

  @ApiPropertyOptional({ example: ['academic-writing', 'time-management'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];
}

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'etudiant', enum: ['etudiant', 'mentor'] })
  @IsIn(['etudiant', 'mentor'], {
    message: 'Le rôle doit être etudiant ou mentor',
  })
  role: 'etudiant' | 'mentor';

  @ApiProperty({ example: true, description: 'Consentement RGPD obligatoire' })
  @IsBoolean({ message: 'Le consentement RGPD est requis' })
  @Equals(true, { message: "Vous devez accepter les conditions d'utilisation" })
  consentGiven: boolean;

  @ApiPropertyOptional({ type: OnboardingDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingDataDto)
  onboardingData?: OnboardingDataDto;
}
