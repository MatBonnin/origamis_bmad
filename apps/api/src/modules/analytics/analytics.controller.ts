import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'support')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Recuperer les indicateurs dashboard' })
  async getDashboard(
    @Query('type') type: 'matching' | 'usage' | 'incidents' = 'usage',
  ) {
    const data = await this.analyticsService.getDashboard(type);
    return { data, error: null };
  }

  @Post('reports')
  @ApiOperation({ summary: 'Generer un rapport analytics' })
  async createReport(
    @Body()
    body: {
      type: 'matching' | 'usage' | 'incidents';
      format?: 'csv' | 'pdf';
    },
  ) {
    const data = await this.analyticsService.createReport(body);
    return { data, error: null };
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Recuperer un rapport analytics' })
  async getReport(@Param('id') reportId: string) {
    const data = this.analyticsService.getReport(reportId);
    return { data, error: null };
  }
}
