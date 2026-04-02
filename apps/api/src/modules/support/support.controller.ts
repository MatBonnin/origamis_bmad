import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'support')
@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('incidents')
  @ApiOperation({ summary: 'Lister la file des incidents support' })
  listIncidents(
    @Query('status') status?: 'open' | 'in_review' | 'resolved' | 'escalated',
  ) {
    const data = this.supportService.listIncidents({ status });
    return { data, error: null };
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Declarer un incident de session' })
  createIncident(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      sessionId: string;
      type: string;
      details: string;
      severity?: 'low' | 'medium' | 'high';
      attachments?: Array<{ type: string; url: string }>;
    },
  ) {
    const data = this.supportService.createIncident({
      ...body,
      reportedBy: user.id,
    });
    return { data, error: null };
  }

  @Get('sessions/:id/incidents')
  @ApiOperation({ summary: 'Consulter les incidents lies a une session' })
  getSessionIncidents(@Param('id') sessionId: string) {
    const data = this.supportService.getSessionIncidents(sessionId);
    return { data, error: null };
  }

  @Patch('incidents/:id/status')
  @ApiOperation({ summary: 'Mettre a jour le statut d un incident' })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') incidentId: string,
    @Body()
    body: {
      status: 'open' | 'in_review' | 'resolved' | 'escalated';
      notes?: string;
    },
  ) {
    const data = this.supportService.updateIncidentStatus(incidentId, {
      ...body,
      performedBy: user.id,
    });
    return { data, error: null };
  }
}
