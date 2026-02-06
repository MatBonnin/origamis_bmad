import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, Max, Min } from 'class-validator';

export class UpdateOnboardingStepDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  step: number;

  @ApiProperty({
    example: {
      profileType: 'etudiant',
      domain: 'informatique',
      level: 'intermediaire',
      year: 'M1',
      objectives: ['trouver un mentor'],
    },
  })
  @IsObject()
  answers: Record<string, unknown>;
}

export class OnboardingStateDto {
  @ApiProperty({ example: 2 })
  step: number;

  @ApiProperty({ type: 'object' })
  answers: Record<string, unknown>;

  @ApiProperty({ example: false })
  completed: boolean;
}
