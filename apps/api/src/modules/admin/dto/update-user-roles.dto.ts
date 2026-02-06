import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsIn } from 'class-validator';

const ALLOWED_ROLES = ['etudiant', 'mentor', 'admin', 'support'] as const;

export class UpdateUserRolesDto {
  @ApiProperty({
    type: [String],
    example: ['mentor', 'support'],
    description: 'Liste des roles a affecter a l\'utilisateur',
  })
  @IsArray({ message: 'roles doit etre un tableau' })
  @ArrayMinSize(1, { message: 'Au moins un role est requis' })
  @ArrayUnique({ message: 'Les roles ne doivent pas contenir de doublons' })
  @IsIn(ALLOWED_ROLES, {
    each: true,
    message: 'Chaque role doit etre etudiant, mentor, admin ou support',
  })
  roles: string[];
}

export { ALLOWED_ROLES };
