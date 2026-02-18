import {
  Body,
  Controller,
  Get,
  Param,
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
import { ContentReportsService, ReportStatus } from '../content-reports';
import { ModerationService } from './moderation.service';

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly reportsService: ContentReportsService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'Lister les signalements en attente (admin)' })
  @ApiResponse({ status: 200, description: 'Signalements recuperes' })
  async getPending(@CurrentUser() user: { id: string; roles: string[] }) {
    const data = await this.moderationService.listPending(user);
    return { data, error: null };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre a jour un statut de signalement (admin)' })
  async patchReportStatus(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') reportId: string,
    @Body() body: { status: ReportStatus },
  ) {
    const data = await this.reportsService.updateStatus(
      user,
      reportId,
      body.status,
    );
    return { data, error: null };
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Appliquer une action de moderation' })
  async postAction(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') reportId: string,
    @Body()
    body: {
      actionType: 'hide' | 'restore' | 'warn' | 'escalate';
      reason: string;
    },
  ) {
    const data = await this.moderationService.applyAction(user, reportId, body);
    return { data, error: null };
  }

  @Get('audit/logs')
  @ApiOperation({ summary: 'Consulter le journal de moderation' })
  async getAuditLogs(@CurrentUser() user: { id: string; roles: string[] }) {
    const data = await this.moderationService.getAuditLogs(user);
    return { data, error: null };
  }
}
