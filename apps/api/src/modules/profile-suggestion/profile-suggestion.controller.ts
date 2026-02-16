import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { ModifySuggestionDto } from './dto';
import { ProfileSuggestionService } from './profile-suggestion.service';

@ApiTags('onboarding')
@Controller('onboarding/profile-suggestion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileSuggestionController {
  constructor(
    private readonly profileSuggestionService: ProfileSuggestionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Recuperer la suggestion de profil type' })
  @ApiResponse({ status: 200, description: 'Suggestion recuperee' })
  async getSuggestion(@CurrentUser() user: UserResponseDto) {
    const result = await this.profileSuggestionService.getSuggestion(user.id);
    return { data: result, error: null };
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accepter la suggestion de profil telle quelle' })
  @ApiResponse({ status: 200, description: 'Profil mis a jour' })
  async acceptSuggestion(@CurrentUser() user: UserResponseDto) {
    const result = await this.profileSuggestionService.acceptSuggestion(
      user.id,
    );
    return { data: result, error: null };
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier et accepter la suggestion de profil' })
  @ApiResponse({ status: 200, description: 'Profil modifie et mis a jour' })
  async modifySuggestion(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: ModifySuggestionDto,
  ) {
    const result = await this.profileSuggestionService.modifySuggestion(
      user.id,
      dto,
    );
    return { data: result, error: null };
  }
}
