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
import { ContentReportsService, ReportStatus } from './content-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ContentReportsController {
  constructor(private readonly reportsService: ContentReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Creer un signalement de contenu' })
  @ApiResponse({ status: 201, description: 'Signalement cree' })
  async createReport(
    @CurrentUser() user: { id: string; roles: string[] },
    @Body()
    body: {
      targetType: 'post' | 'reply' | 'user';
      targetId: string;
      reason: string;
      details?: string;
      anonymous?: boolean;
      captchaToken?: string;
    },
  ) {
    const data = await this.reportsService.createReport(user, body);
    return { data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un signalement' })
  async getReport(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') reportId: string,
  ) {
    const data = await this.reportsService.getReport(user, reportId);
    return { data, error: null };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre a jour le statut d un signalement' })
  async patchStatus(
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
}
