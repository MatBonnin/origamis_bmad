import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const SESSION_DURATIONS = [30, 45, 60, 90, 120] as const;
const START_TIME_INCREMENTS = [15, 30, 60] as const;
const OVERRIDE_TYPES = ['unavailable', 'custom_hours'] as const;

// ─── Time Window ──────────────────────────────────────────────────────────────

export class TimeWindowDto {
  @ApiProperty({ description: 'Heure de debut HH:mm', example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format HH:mm requis (ex: 09:00)',
  })
  start: string;

  @ApiProperty({ description: 'Heure de fin HH:mm', example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format HH:mm requis (ex: 12:00)',
  })
  end: string;
}

// ─── Scheduling Settings ──────────────────────────────────────────────────────

export class UpdateSchedulingSettingsDto {
  @ApiPropertyOptional({
    description: 'Duree des sessions en minutes',
    enum: SESSION_DURATIONS,
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @IsIn(SESSION_DURATIONS)
  sessionDuration?: number;

  @ApiPropertyOptional({
    description: 'Temps tampon avant la session (minutes)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferBefore?: number;

  @ApiPropertyOptional({
    description: 'Temps tampon apres la session (minutes)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferAfter?: number;

  @ApiPropertyOptional({
    description: 'Preavis minimum en heures (1-168)',
    example: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  minNoticeHours?: number;

  @ApiPropertyOptional({
    description: "Jours maximum a l'avance pour reserver (7-365)",
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  maxDaysAhead?: number;

  @ApiPropertyOptional({
    description: 'Intervalle des heures de debut',
    enum: START_TIME_INCREMENTS,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @IsIn(START_TIME_INCREMENTS)
  startTimeIncrement?: number;

  @ApiPropertyOptional({
    description: 'Limite de sessions par jour (null = illimite)',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Limite de sessions par semaine (null = illimite)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  weeklyLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Fuseau horaire IANA',
    example: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// ─── Weekly Schedule ──────────────────────────────────────────────────────────

export class DayScheduleDto {
  @ApiProperty({
    description: 'Jour de la semaine (0=dimanche, 6=samedi)',
    enum: WEEK_DAYS,
  })
  @IsInt()
  @IsIn(WEEK_DAYS)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Ce jour est-il ouvert aux reservations ?',
    example: true,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({
    description: 'Fenetres de disponibilite',
    type: [TimeWindowDto],
    example: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  timeWindows: TimeWindowDto[];
}

export class UpdateWeeklyScheduleDto {
  @ApiProperty({
    description: 'Planning hebdomadaire complet (7 jours)',
    type: [DayScheduleDto],
  })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  schedule: DayScheduleDto[];
}

// ─── Date Overrides ───────────────────────────────────────────────────────────

export class CreateDateOverrideDto {
  @ApiProperty({
    description: 'Date specifique (YYYY-MM-DD)',
    example: '2026-03-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format YYYY-MM-DD requis',
  })
  date: string;

  @ApiProperty({
    description: "Type d'exception",
    enum: OVERRIDE_TYPES,
    example: 'unavailable',
  })
  @IsString()
  @IsIn(OVERRIDE_TYPES)
  overrideType: 'unavailable' | 'custom_hours';

  @ApiPropertyOptional({
    description: 'Fenetres horaires (requis si custom_hours)',
    type: [TimeWindowDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  timeWindows?: TimeWindowDto[];

  @ApiPropertyOptional({
    description: "Raison de l'exception",
    example: 'Vacances',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDateOverrideDto {
  @ApiPropertyOptional({
    description: "Type d'exception",
    enum: OVERRIDE_TYPES,
  })
  @IsOptional()
  @IsString()
  @IsIn(OVERRIDE_TYPES)
  overrideType?: 'unavailable' | 'custom_hours';

  @ApiPropertyOptional({
    description: 'Fenetres horaires',
    type: [TimeWindowDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  timeWindows?: TimeWindowDto[];

  @ApiPropertyOptional({
    description: "Raison de l'exception",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── General Availability ─────────────────────────────────────────────────────

export class UpdateGeneralAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Mentor disponible pour les reservations',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Prochaine disponibilite (ISO 8601)',
    example: '2026-03-20T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  nextAvailableAt?: string;
}

// ─── Query DTOs ───────────────────────────────────────────────────────────────

export class GetAvailableSlotsQueryDto {
  @ApiPropertyOptional({
    description: "Date de debut (YYYY-MM-DD), defaut: aujourd'hui",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD), defaut: startDate + maxDaysAhead',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface SchedulingSettings {
  sessionDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  startTimeIncrement: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  timezone: string;
}

export interface WeeklyScheduleResponse {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  timeWindows: { start: string; end: string }[];
}

export interface DateOverrideResponse {
  id: string;
  date: string;
  overrideType: 'unavailable' | 'custom_hours';
  timeWindows: { start: string; end: string }[] | null;
  reason: string | null;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean; // false if already booked
}

export interface AvailableSlotsResponse {
  mentorId: string;
  timezone: string;
  sessionDuration: number;
  hourlyRate: number | null;
  slots: AvailableSlot[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface FullAvailabilityResponse {
  isAvailable: boolean;
  nextAvailableAt: string | null;
  settings: SchedulingSettings;
  weeklySchedule: WeeklyScheduleResponse[];
  dateOverrides: DateOverrideResponse[];
}
