import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const NOTIFICATION_CHANNELS = ['email', 'push', 'in_app'] as const;
export const NOTIFICATION_CATEGORIES = ['messages', 'rdv', 'system'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export class NotificationPreferenceDto {
  @ApiProperty({ enum: NOTIFICATION_CHANNELS, example: 'email' })
  @IsIn(NOTIFICATION_CHANNELS)
  channel: NotificationChannel;

  @ApiProperty({ enum: NOTIFICATION_CATEGORIES, example: 'messages' })
  @IsIn(NOTIFICATION_CATEGORIES)
  category: NotificationCategory;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];
}

export class NotificationPreferencesResponseDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  preferences: NotificationPreferenceDto[];
}
