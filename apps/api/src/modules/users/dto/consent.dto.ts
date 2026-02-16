import { ApiProperty } from '@nestjs/swagger';

export class ConsentResponseDto {
  @ApiProperty({ description: 'Statut actif du consentement' })
  hasActiveConsent: boolean;

  @ApiProperty({ description: 'Version du consentement', nullable: true })
  consentVersion: string | null;

  @ApiProperty({ description: 'Date du consentement', nullable: true })
  consentedAt: Date | null;

  @ApiProperty({ description: 'Date du retrait', nullable: true })
  withdrawnAt: Date | null;
}

export class ConsentWithdrawResponseDto {
  @ApiProperty({ description: 'Statut du consentement apres retrait' })
  hasActiveConsent: boolean;

  @ApiProperty({ description: 'Date du retrait' })
  withdrawnAt: Date;

  @ApiProperty({ description: "Message d'impact du retrait" })
  impactMessage: string;
}
