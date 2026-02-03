import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un nouveau compte' })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/AuthResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email déjà utilisé',
  })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { data: result, error: null };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/AuthResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Identifiants invalides',
  })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { data: result, error: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir le profil de l\'utilisateur connecté' })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré',
    schema: {
      properties: {
        data: { $ref: '#/components/schemas/UserResponseDto' },
        error: { nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMe(@CurrentUser() user: UserResponseDto) {
    return { data: user, error: null };
  }
}
