import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Identifiant du destinataire' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ description: 'ID client pour deduplication' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;

  @ApiPropertyOptional({ enum: ['push', 'in_app'], default: 'in_app' })
  @IsOptional()
  @IsIn(['push', 'in_app'])
  notifyChannel?: 'push' | 'in_app';
}
