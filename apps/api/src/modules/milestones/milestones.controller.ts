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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { MilestonesService } from './milestones.service';

@ApiTags('milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('progression')
  @ApiOperation({ summary: 'Recuperer la progression des jalons' })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['message', 'rdv', 'visio'],
  })
  @ApiResponse({ status: 200, description: 'Progression recuperee' })
  async getProgression(
    @CurrentUser() user: { id: string; roles: string[] },
    @Query('user_id') userId?: string,
    @Query('type') type?: 'message' | 'rdv' | 'visio',
  ) {
    const data = await this.milestonesService.getProgression(user, {
      userId,
      type,
    });

    return { data, error: null };
  }

  @Get('students/:id/progression')
  @ApiOperation({ summary: 'Recuperer la progression d un etudiant (mentor)' })
  async getStudentProgression(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') studentId: string,
  ) {
    const data = await this.milestonesService.getStudentProgression(
      user,
      studentId,
    );
    return { data, error: null };
  }

  @Get('students/:id/milestone-insights')
  @ApiOperation({ summary: 'Recuperer les insights de progression etudiant' })
  async getStudentInsights(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') studentId: string,
  ) {
    const data = await this.milestonesService.getStudentInsights(
      user,
      studentId,
    );
    return { data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un jalon' })
  async getMilestone(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') milestoneId: string,
  ) {
    const data = await this.milestonesService.getMilestone(user, milestoneId);
    return { data, error: null };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre a jour le statut d un jalon' })
  async updateStatus(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') milestoneId: string,
    @Body()
    body: {
      status: 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';
      comment?: string;
    },
  ) {
    const data = await this.milestonesService.updateMilestoneStatus(
      user,
      milestoneId,
      body,
    );
    return { data, error: null };
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Valider ou refuser un jalon (mentor)' })
  async reviewMilestone(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') milestoneId: string,
    @Body() body: { approved: boolean; comments?: string },
  ) {
    const data = await this.milestonesService.reviewMilestone(
      user,
      milestoneId,
      body,
    );
    return { data, error: null };
  }

}
