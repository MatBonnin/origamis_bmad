import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { UpdateOnboardingStepDto } from './dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Recuperer l etat onboarding de l utilisateur connecte',
  })
  @ApiResponse({ status: 200, description: 'Etat onboarding recupere' })
  async getMyOnboarding(@CurrentUser() user: UserResponseDto) {
    const state = await this.onboardingService.getMyOnboarding(user.id);
    return { data: state, error: null };
  }

  @Patch('step')
  @ApiOperation({ summary: 'Mettre a jour une etape onboarding (autosave)' })
  @ApiResponse({ status: 200, description: 'Etape sauvegardee' })
  async updateStep(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateOnboardingStepDto,
  ) {
    const state = await this.onboardingService.updateStep(user.id, dto);
    return { data: state, error: null };
  }

  @Post('complete')
  @ApiOperation({ summary: 'Marquer l onboarding comme complete' })
  @ApiResponse({ status: 200, description: 'Onboarding complete' })
  async complete(@CurrentUser() user: UserResponseDto) {
    const data = await this.onboardingService.complete(user.id);
    return { data, error: null };
  }
}
