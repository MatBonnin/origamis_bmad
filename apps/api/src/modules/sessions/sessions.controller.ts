import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import {
  SessionHistoryCategory,
  SessionHistoryExportFormat,
  SessionsService,
} from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Consulter l historique des sessions avec pagination et filtres',
  })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['message', 'rdv', 'visio'],
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Historique des sessions recupere' })
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('user_id') userId?: string,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit);
    const data = await this.sessionsService.getHistory(user.id, {
      userId,
      category: category as SessionHistoryCategory | undefined,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return { data, error: null };
  }

  @Get(':id/replay-link')
  @ApiOperation({ summary: 'Recuperer le lien de replay si disponible' })
  @ApiResponse({ status: 200, description: 'Lien replay recupere' })
  async getReplayLink(
    @CurrentUser() user: { id: string },
    @Param('id') sessionId: string,
  ) {
    const data = await this.sessionsService.getReplayLink(user.id, sessionId);
    return { data, error: null };
  }

  @Post('history/export')
  @ApiOperation({ summary: 'Exporter l historique des sessions (CSV/PDF)' })
  @ApiResponse({ status: 200, description: 'Export cree' })
  async exportHistory(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      user_id?: string;
      category?: SessionHistoryCategory;
      format?: SessionHistoryExportFormat;
    },
  ) {
    const data = await this.sessionsService.exportHistory(user.id, {
      userId: body.user_id,
      category: body.category,
      format: body.format,
    });
    return { data, error: null };
  }
}
