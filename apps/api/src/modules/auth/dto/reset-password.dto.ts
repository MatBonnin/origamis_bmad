import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123token',
    description: 'Token de réinitialisation reçu par email',
  })
  @IsString({ message: 'Le token doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le token est requis' })
  token: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'Nouveau mot de passe (min 8 caractères, 1 majuscule, 1 chiffre)',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule et un chiffre',
  })
  password: string;
}
