import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { MentorsEpic8Service } from './mentors-epic8.service';

@ApiTags('mentor-workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MentorsWorkflowController {
  constructor(private readonly epic8: MentorsEpic8Service) {}

  @Post('mentor/program-templates')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Creer un template de parcours mentor' })
  async createTemplate(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      title: string;
      description?: string;
      milestones: Array<{
        title: string;
        description?: string;
        dueDaysFromStart: number;
      }>;
    },
  ) {
    const data = await this.epic8.createProgramTemplate(user.id, body);
    return { data, error: null };
  }

  @Get('mentor/program-templates')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Lister les templates de parcours mentor' })
  async listTemplates(@CurrentUser() user: { id: string }) {
    const data = await this.epic8.listProgramTemplates(user.id);
    return { data, error: null };
  }

  @Patch('mentor/program-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Modifier un template de parcours mentor' })
  async patchTemplate(
    @CurrentUser() user: { id: string },
    @Param('id') templateId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      milestones?: Array<{
        title: string;
        description?: string;
        dueDaysFromStart: number;
      }>;
    },
  ) {
    const data = await this.epic8.updateProgramTemplate(
      user.id,
      templateId,
      body,
    );
    return { data, error: null };
  }

  @Post('students/:id/programs')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Assigner un parcours template a un etudiant' })
  async assignProgram(
    @CurrentUser() user: { id: string },
    @Param('id') studentId: string,
    @Body() body: { templateId: string; title?: string; startAt?: string },
  ) {
    const data = await this.epic8.assignProgramToStudent(
      user.id,
      studentId,
      body,
    );
    return { data, error: null };
  }

  @Get('mentor/programs')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Lister les parcours des etudiants du mentor' })
  async listPrograms(
    @CurrentUser() user: { id: string },
    @Query('studentId') studentId?: string,
  ) {
    const data = await this.epic8.listPrograms(user.id, studentId);
    return { data, error: null };
  }

  @Get('mentor/students')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Lister les etudiants actuels du mentor' })
  async listMentorStudents(@CurrentUser() user: { id: string }) {
    const data = await this.epic8.listMentorStudents(user.id);
    return { data, error: null };
  }

  @Patch('mentor/program-milestones/:id')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Mettre a jour un jalon de parcours etudiant' })
  async patchProgramMilestone(
    @CurrentUser() user: { id: string },
    @Param('id') milestoneId: string,
    @Body()
    body: {
      status?: 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';
      deadlineAt?: string;
    },
  ) {
    const data = await this.epic8.updateProgramMilestone(
      user.id,
      milestoneId,
      body,
    );
    return { data, error: null };
  }

  @Post('programs/:id/documents')
  @ApiOperation({ summary: 'Uploader un document de parcours' })
  async uploadProgramDocument(
    @CurrentUser() user: { id: string },
    @Param('id') programId: string,
    @Body()
    body: {
      url: string;
      type?: 'memory' | 'brief' | 'annex' | 'other';
      fileName?: string;
    },
  ) {
    const data = await this.epic8.uploadProgramDocument(
      user.id,
      programId,
      body,
    );
    return { data, error: null };
  }

  @Get('programs/:id/documents')
  @ApiOperation({ summary: 'Lister les documents de parcours' })
  async listProgramDocuments(
    @CurrentUser() user: { id: string },
    @Param('id') programId: string,
  ) {
    const data = await this.epic8.listProgramDocuments(user.id, programId);
    return { data, error: null };
  }

  @Delete('programs/:id/documents/:docId')
  @ApiOperation({ summary: 'Supprimer un document de parcours' })
  async deleteProgramDocument(
    @CurrentUser() user: { id: string },
    @Param('id') programId: string,
    @Param('docId') docId: string,
  ) {
    const data = await this.epic8.deleteProgramDocument(
      user.id,
      programId,
      docId,
    );
    return { data, error: null };
  }

  @Post('mentors/:id/requests')
  @ApiOperation({
    summary: 'Creer une demande d accompagnement vers un mentor',
  })
  async createMentorRequest(
    @CurrentUser() user: { id: string },
    @Param('id') mentorId: string,
    @Body() body: { message?: string },
  ) {
    const data = await this.epic8.createMentorRequest(
      user.id,
      mentorId,
      body.message,
    );
    return { data, error: null };
  }

  @Get('mentor/requests')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Inbox des demandes mentor' })
  async listMentorRequests(@CurrentUser() user: { id: string }) {
    const data = await this.epic8.listMentorRequests(user.id);
    return { data, error: null };
  }

  @Get('students/me/mentor')
  @ApiOperation({
    summary: "Recuperer le mentor actuel de l'etudiant connecte",
  })
  async getMyMentor(@CurrentUser() user: { id: string }) {
    const data = await this.epic8.getMyMentor(user.id);
    return { data, error: null };
  }

  @Patch('mentor/requests/:id')
  @UseGuards(RolesGuard)
  @Roles('mentor')
  @ApiOperation({ summary: 'Accepter/refuser une demande mentor' })
  async patchMentorRequest(
    @CurrentUser() user: { id: string },
    @Param('id') requestId: string,
    @Body() body: { status: 'accepted' | 'rejected'; reason?: string },
  ) {
    const data = await this.epic8.updateMentorRequest(user.id, requestId, body);
    return { data, error: null };
  }
}
