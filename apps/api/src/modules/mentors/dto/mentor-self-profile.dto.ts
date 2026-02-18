import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const EDUCATION_LEVELS = [
  'bac',
  'bac+2',
  'bac+3',
  'bac+5',
  'doctorat',
  'autre',
] as const;
const SUPPORT_TYPES = ['ponctuel', 'suivi_regulier', 'long_uniquement'] as const;

export class MentorTariffsDto {
  @ApiProperty({ description: 'Tarif minimum horaire', example: 30 })
  @IsInt()
  @Min(1)
  @Max(1000)
  min: number;

  @ApiProperty({ description: 'Tarif maximum horaire', example: 50 })
  @IsInt()
  @Min(1)
  @Max(1000)
  max: number;

  @ApiProperty({ description: 'Devise ISO', example: 'EUR' })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency: string;
}

export class MentorAvailabilitySlotDto {
  @ApiProperty({ description: 'Jour de la semaine (0 dimanche - 6 samedi)' })
  @IsInt()
  @IsIn(WEEK_DAYS)
  dayOfWeek: number;

  @ApiProperty({ description: 'Heure de debut HH:mm (UTC)', example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @ApiProperty({ description: 'Heure de fin HH:mm (UTC)', example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;
}

export class MentorAvailabilityDto {
  @ApiProperty({ description: 'Mentor disponible immediatement' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Prochaine disponibilite en UTC (ISO 8601, suffixe Z)',
    example: '2026-02-20T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  nextAvailableAt?: string;

  @ApiPropertyOptional({ type: [MentorAvailabilitySlotDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MentorAvailabilitySlotDto)
  slots?: MentorAvailabilitySlotDto[];
}

export class CreateMentorSelfProfileDto {
  @ApiProperty({ description: 'Domaine principal', example: 'informatique' })
  @IsString()
  @MaxLength(100)
  domain: string;

  @ApiProperty({
    description: 'Competences principales',
    type: [String],
    example: ['react', 'typescript'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  expertiseTags: string[];

  @ApiPropertyOptional({ type: [String], example: ['fr', 'en'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ type: [String], example: ['license-coaching'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['debutant', 'intermediaire'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  supportedLevels?: string[];

  @ApiPropertyOptional({ description: 'Bio mentor', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'URL de la banniere mentor' })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'A propos du mentor', maxLength: 1200 })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  about?: string;

  @ApiPropertyOptional({
    description: "Niveau d'etudes",
    enum: EDUCATION_LEVELS,
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: string;

  @ApiPropertyOptional({
    description: 'Diplomes du mentor',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  degrees?: string[];

  @ApiPropertyOptional({
    description: 'Mots-cles de matching',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Liens professionnels du mentor',
    type: [String],
    example: ['https://www.linkedin.com/in/alice-martin'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { each: true })
  professionalLinks?: string[];

  @ApiPropertyOptional({
    description: "Types d'accompagnement proposes",
    type: [String],
    enum: SUPPORT_TYPES,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(SUPPORT_TYPES, { each: true })
  supportTypes?: string[];

  @ApiProperty({ type: MentorTariffsDto })
  @ValidateNested()
  @Type(() => MentorTariffsDto)
  tariffs: MentorTariffsDto;

  @ApiProperty({ type: MentorAvailabilityDto })
  @ValidateNested()
  @Type(() => MentorAvailabilityDto)
  availability: MentorAvailabilityDto;
}

export class UpdateMentorSelfProfileDto {
  @ApiPropertyOptional({
    description: 'Domaine principal',
    example: 'informatique',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiPropertyOptional({
    description: 'Competences principales',
    type: [String],
    example: ['react', 'typescript'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  expertiseTags?: string[];

  @ApiPropertyOptional({ type: [String], example: ['fr', 'en'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ type: [String], example: ['license-coaching'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['debutant', 'intermediaire'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  supportedLevels?: string[];

  @ApiPropertyOptional({ description: 'Bio mentor', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'URL de la banniere mentor' })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'A propos du mentor', maxLength: 1200 })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  about?: string;

  @ApiPropertyOptional({
    description: "Niveau d'etudes",
    enum: EDUCATION_LEVELS,
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: string;

  @ApiPropertyOptional({
    description: 'Diplomes du mentor',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  degrees?: string[];

  @ApiPropertyOptional({
    description: 'Mots-cles de matching',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Liens professionnels du mentor',
    type: [String],
    example: ['https://www.linkedin.com/in/alice-martin'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { each: true })
  professionalLinks?: string[];

  @ApiPropertyOptional({
    description: "Types d'accompagnement proposes",
    type: [String],
    enum: SUPPORT_TYPES,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(SUPPORT_TYPES, { each: true })
  supportTypes?: string[];

  @ApiPropertyOptional({ type: MentorTariffsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MentorTariffsDto)
  tariffs?: MentorTariffsDto;

  @ApiPropertyOptional({ type: MentorAvailabilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MentorAvailabilityDto)
  availability?: MentorAvailabilityDto;
}
