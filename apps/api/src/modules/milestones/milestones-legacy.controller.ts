import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { MilestonesService } from './milestones.service';

@ApiTags('milestones-legacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MilestonesLegacyController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('progression')
  @ApiOperation({ summary: 'Alias legacy de /milestones/progression' })
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
  @ApiOperation({ summary: 'Alias legacy de /milestones/students/:id/progression' })
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
  @ApiOperation({ summary: 'Alias legacy de /milestones/students/:id/milestone-insights' })
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
}

