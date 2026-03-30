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
import { SessionsGateway } from './sessions.gateway';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsGateway: SessionsGateway,
  ) {}

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

  @Get('room/:token')
  @ApiOperation({ summary: 'Recuperer la salle de session par token' })
  @ApiResponse({ status: 200, description: 'Salle de session recuperee' })
  async getRoomByToken(
    @CurrentUser() user: { id: string },
    @Param('token') token: string,
  ) {
    const data = await this.sessionsService.getSessionRoomByToken(user.id, token);
    return { data, error: null };
  }

  @Post(':bookingId/calls')
  @ApiOperation({ summary: 'Creer un nouvel appel pour une reservation' })
  @ApiResponse({ status: 201, description: 'Appel cree' })
  async createCall(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.createCall(user.id, bookingId);
    return { data, error: null };
  }

  @Get(':bookingId/calls/active')
  @ApiOperation({ summary: 'Recuperer l appel actif d une reservation' })
  @ApiResponse({ status: 200, description: 'Appel actif recupere' })
  async getActiveCall(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.getActiveCall(user.id, bookingId);
    return { data, error: null };
  }

  @Get('calls/:callToken')
  @ApiOperation({ summary: 'Recuperer un appel par token' })
  @ApiResponse({ status: 200, description: 'Appel recupere' })
  async getCallByToken(
    @CurrentUser() user: { id: string },
    @Param('callToken') callToken: string,
  ) {
    const data = await this.sessionsService.getCallByToken(user.id, callToken);
    return { data, error: null };
  }

  @Post('calls/:callId/transcription/consent')
  @ApiOperation({ summary: 'Enregistrer le consentement de transcription pour un appel' })
  @ApiResponse({ status: 200, description: 'Consentement enregistre' })
  async recordCallTranscriptConsent(
    @CurrentUser() user: { id: string },
    @Param('callId') callId: string,
    @Body() body: { decision: 'accept' | 'decline' },
  ) {
    const data = await this.sessionsService.recordCallTranscriptConsent(
      user.id,
      callId,
      body,
    );
    return { data, error: null };
  }

  @Get('calls/:callId/transcript')
  @ApiOperation({ summary: 'Obtenir la transcription d un appel' })
  @ApiResponse({ status: 200, description: 'Transcription recuperee' })
  async getCallTranscript(
    @CurrentUser() user: { id: string },
    @Param('callId') callId: string,
  ) {
    const data = await this.sessionsService.getCallTranscript(user.id, callId);
    return { data, error: null };
  }

  @Get(':bookingId/chat/messages')
  @ApiOperation({ summary: 'Lister les messages du chat de session' })
  @ApiResponse({ status: 200, description: 'Messages recuperes' })
  async getSessionChatMessages(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.listSessionChatMessages(user.id, bookingId);
    return { data, error: null };
  }

  @Post(':bookingId/chat/messages')
  @ApiOperation({ summary: 'Envoyer un message dans le chat de session' })
  @ApiResponse({ status: 201, description: 'Message cree' })
  async postSessionChatMessage(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body() body: { body?: string; documentId?: string },
  ) {
    const data = await this.sessionsService.createSessionChatMessage(user.id, bookingId, body);
    this.sessionsGateway.emitChatMessageCreated(data, bookingId);
    return { data, error: null };
  }

  @Post(':bookingId/documents')
  @ApiOperation({ summary: 'Enregistrer un document partage dans la session' })
  @ApiResponse({ status: 201, description: 'Document enregistre' })
  async createSessionDocument(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body()
    body: {
      url: string;
      originalName: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const data = await this.sessionsService.createSessionDocument(user.id, bookingId, body);
    return { data, error: null };
  }

  @Post(':bookingId/transcription/consent')
  @ApiOperation({ summary: 'Enregistrer le consentement de transcription' })
  @ApiResponse({ status: 200, description: 'Consentement enregistre' })
  async recordTranscriptConsent(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body() body: { decision: 'accept' | 'decline' },
  ) {
    const data = await this.sessionsService.recordTranscriptConsent(
      user.id,
      bookingId,
      body,
    );
    return { data, error: null };
  }

  @Post(':bookingId/terminate')
  @ApiOperation({ summary: 'Terminer immediatement une session visio' })
  @ApiResponse({ status: 200, description: 'Session terminee' })
  async terminateRoom(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.terminateRoom(user.id, bookingId);
    return { data, error: null };
  }

  @Get(':bookingId/transcript')
  @ApiOperation({ summary: 'Obtenir la transcription de session' })
  @ApiResponse({ status: 200, description: 'Transcription recuperee' })
  async getTranscript(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.getTranscript(user.id, bookingId);
    return { data, error: null };
  }

  // ─── Notes ────────────────────────────────────────────────────────────────

  @Post(':bookingId/notes')
  @ApiOperation({ summary: 'Creer ou mettre a jour une note post-session' })
  @ApiResponse({ status: 200, description: 'Note sauvegardee' })
  async createNote(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body() body: { content: string },
  ) {
    const data = await this.sessionsService.createNote(user.id, bookingId, body);
    return { data, error: null };
  }

  @Get(':bookingId/notes')
  @ApiOperation({ summary: 'Obtenir les notes d une session' })
  @ApiResponse({ status: 200, description: 'Notes recuperees' })
  async getNotes(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.getNotes(user.id, bookingId);
    return { data, error: null };
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────

  @Post(':bookingId/feedback')
  @ApiOperation({ summary: 'Soumettre le feedback mentor post-session' })
  @ApiResponse({ status: 200, description: 'Feedback soumis' })
  async submitFeedback(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
    @Body()
    body: {
      nextActions: string[];
      objectivesMet: boolean;
      linkedMilestoneId?: string;
      notesForStudent?: string;
    },
  ) {
    const data = await this.sessionsService.submitFeedback(user.id, bookingId, body);
    return { data, error: null };
  }

  @Get(':bookingId/feedback')
  @ApiOperation({ summary: 'Obtenir le feedback d une session' })
  @ApiResponse({ status: 200, description: 'Feedback recupere' })
  async getFeedback(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    const data = await this.sessionsService.getFeedback(user.id, bookingId);
    return { data, error: null };
  }
}
