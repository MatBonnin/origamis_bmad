import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  booking_status,
  calendar_provider,
  mentor_request_status,
  program_milestone_status,
  verification_status,
} from '@prisma/client';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';

@Injectable()
export class MentorsEpic8Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMyDocuments(userId: string) {
    await this.assertMentorProfile(userId);
    const rows = await this.prisma.mentor_documents.findMany({
      where: { mentor_id: userId, deleted_at: null },
      orderBy: { uploaded_at: 'desc' },
    });

    return {
      documents: rows.map((row) => ({
        documentId: row.id,
        type: row.document_type,
        url: row.url,
        verificationStatus: row.verification_status,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at?.toISOString() ?? null,
        uploadedAt: row.uploaded_at.toISOString(),
      })),
    };
  }

  async uploadMyDocument(
    userId: string,
    input: { type: 'diploma' | 'certificate'; fileUrl: string },
  ) {
    await this.assertMentorProfile(userId);
    this.assertHttpsUrl(input.fileUrl, 'fileUrl');

    const row = await this.prisma.mentor_documents.create({
      data: {
        mentor_id: userId,
        document_type: input.type,
        url: input.fileUrl,
      },
    });

    await this.recomputePublishReadiness(userId);

    return {
      document: {
        documentId: row.id,
        type: row.document_type,
        url: row.url,
        verificationStatus: row.verification_status,
        uploadedAt: row.uploaded_at.toISOString(),
      },
    };
  }

  async deleteMyDocument(userId: string, docId: string) {
    const row = await this.prisma.mentor_documents.findUnique({
      where: { id: docId },
      select: { mentor_id: true, deleted_at: true },
    });

    if (!row || row.deleted_at) {
      throw new NotFoundException({
        code: 'MENTOR_DOCUMENT_NOT_FOUND',
        message: 'Document mentor introuvable',
      });
    }
    if (row.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'MENTOR_DOCUMENT_FORBIDDEN',
        message: 'Acces refuse a ce document',
      });
    }

    await this.prisma.mentor_documents.update({
      where: { id: docId },
      data: { deleted_at: new Date() },
    });

    await this.recomputePublishReadiness(userId);

    return { success: true };
  }

  async getMentorDocumentsForAdmin(mentorId: string) {
    await this.assertMentorProfile(mentorId);
    const rows = await this.prisma.mentor_documents.findMany({
      where: { mentor_id: mentorId, deleted_at: null },
      orderBy: { uploaded_at: 'desc' },
    });

    return {
      mentorId,
      documents: rows.map((row) => ({
        documentId: row.id,
        type: row.document_type,
        url: row.url,
        verificationStatus: row.verification_status,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at?.toISOString() ?? null,
        uploadedAt: row.uploaded_at.toISOString(),
      })),
    };
  }

  async updateMentorDocumentStatus(
    adminUserId: string,
    mentorId: string,
    docId: string,
    status: verification_status,
  ) {
    const row = await this.prisma.mentor_documents.findUnique({
      where: { id: docId },
      select: { mentor_id: true, deleted_at: true },
    });

    if (!row || row.deleted_at || row.mentor_id !== mentorId) {
      throw new NotFoundException({
        code: 'MENTOR_DOCUMENT_NOT_FOUND',
        message: 'Document mentor introuvable',
      });
    }

    const updated = await this.prisma.mentor_documents.update({
      where: { id: docId },
      data: {
        verification_status: status,
        verified_by: adminUserId,
        verified_at: new Date(),
      },
    });

    await this.recomputePublishReadiness(mentorId);

    return {
      document: {
        documentId: updated.id,
        verificationStatus: updated.verification_status,
        verifiedBy: updated.verified_by,
        verifiedAt: updated.verified_at?.toISOString() ?? null,
      },
    };
  }

  async connectGoogleCalendar(userId: string, authCode?: string) {
    await this.assertMentorProfile(userId);
    const token = Buffer.from(
      `${authCode ?? 'manual'}:${userId}`,
      'utf-8',
    ).toString('base64');

    const connection = await this.prisma.mentor_calendar_connections.upsert({
      where: {
        mentor_id_provider: {
          mentor_id: userId,
          provider: calendar_provider.google,
        },
      },
      create: {
        mentor_id: userId,
        provider: calendar_provider.google,
        access_token_enc: token,
        refresh_token_enc: token,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        disconnected_at: null,
      },
      update: {
        access_token_enc: token,
        refresh_token_enc: token,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        disconnected_at: null,
      },
    });

    return {
      connection: {
        provider: connection.provider,
        connectedAt: connection.connected_at.toISOString(),
      },
    };
  }

  async disconnectGoogleCalendar(userId: string) {
    const existing = await this.prisma.mentor_calendar_connections.findUnique({
      where: {
        mentor_id_provider: {
          mentor_id: userId,
          provider: calendar_provider.google,
        },
      },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.mentor_calendar_connections.update({
      where: { id: existing.id },
      data: {
        disconnected_at: new Date(),
        access_token_enc: 'revoked',
        refresh_token_enc: null,
      },
    });

    await this.prisma.mentor_calendar_busy_slots.deleteMany({
      where: { mentor_id: userId, provider: calendar_provider.google },
    });

    return { success: true };
  }

  async syncGoogleCalendar(
    userId: string,
    input: {
      busySlots?: Array<{
        startAt: string;
        endAt: string;
        providerEventId?: string;
      }>;
    },
  ) {
    const existing = await this.prisma.mentor_calendar_connections.findUnique({
      where: {
        mentor_id_provider: {
          mentor_id: userId,
          provider: calendar_provider.google,
        },
      },
    });

    if (!existing || existing.disconnected_at) {
      throw new BadRequestException({
        code: 'GOOGLE_CALENDAR_NOT_CONNECTED',
        message: 'Agenda Google non connecte',
      });
    }

    const busySlots = input.busySlots ?? [];

    await this.prisma.mentor_calendar_busy_slots.deleteMany({
      where: { mentor_id: userId, provider: calendar_provider.google },
    });

    for (let index = 0; index < busySlots.length; index += 1) {
      const slot = busySlots[index];
      const startAt = new Date(slot.startAt);
      const endAt = new Date(slot.endAt);
      if (
        Number.isNaN(startAt.getTime()) ||
        Number.isNaN(endAt.getTime()) ||
        startAt >= endAt
      ) {
        throw new BadRequestException({
          code: 'INVALID_BUSY_SLOT',
          message: 'Slot occupe invalide',
        });
      }

      await this.prisma.mentor_calendar_busy_slots.create({
        data: {
          mentor_id: userId,
          provider: calendar_provider.google,
          provider_event_id: slot.providerEventId ?? `manual-${index}`,
          start_at: startAt,
          end_at: endAt,
        },
      });
    }

    await this.prisma.mentor_calendar_connections.update({
      where: { id: existing.id },
      data: { last_sync_at: new Date() },
    });

    return {
      sync: {
        provider: 'google',
        importedBusySlots: busySlots.length,
        syncedAt: new Date().toISOString(),
      },
    };
  }

  async createMentorRequest(
    studentId: string,
    mentorId: string,
    message?: string,
  ) {
    await this.assertMentorProfile(mentorId);
    if (studentId === mentorId) {
      throw new BadRequestException({
        code: 'MENTOR_REQUEST_SELF_FORBIDDEN',
        message: 'Impossible de creer une demande a soi-meme',
      });
    }

    const request = await this.prisma.mentor_requests.create({
      data: {
        mentor_id: mentorId,
        student_id: studentId,
        status: mentor_request_status.pending,
        message: message?.trim() || null,
      },
    });

    await this.safeNotify(mentorId, {
      title: 'Nouvelle demande d accompagnement',
      message: 'Un etudiant vous a envoye une demande',
      payload: { requestId: request.id, mentorId },
    });

    return {
      request: {
        requestId: request.id,
        mentorId: request.mentor_id,
        studentId: request.student_id,
        status: request.status,
        message: request.message,
        decisionReason: request.decision_reason,
        createdAt: request.created_at.toISOString(),
      },
    };
  }

  async listMentorRequests(mentorId: string) {
    const rows = await this.prisma.mentor_requests.findMany({
      where: { mentor_id: mentorId },
      include: {
        student: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      requests: rows.map((row) => ({
        requestId: row.id,
        mentorId: row.mentor_id,
        studentId: row.student_id,
        status: row.status,
        message: row.message,
        decisionReason: row.decision_reason,
        studentName:
          `${row.student.first_name} ${row.student.last_name}`.trim(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  }

  async getMyMentor(studentId: string) {
    const acceptedRequest = await this.prisma.mentor_requests.findFirst({
      where: {
        student_id: studentId,
        status: mentor_request_status.accepted,
      },
      include: {
        mentor: {
          select: {
            domain: true,
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (acceptedRequest?.mentor?.user) {
      return {
        mentorId: acceptedRequest.mentor.user.id,
        fullName:
          `${acceptedRequest.mentor.user.first_name} ${acceptedRequest.mentor.user.last_name}`.trim(),
        avatarUrl: acceptedRequest.mentor.user.avatar_url ?? null,
        domain: acceptedRequest.mentor.domain,
      };
    }

    const recentBooking = await this.prisma.bookings.findFirst({
      where: {
        student_id: studentId,
        status: {
          in: [booking_status.confirmed, booking_status.completed],
        },
      },
      include: {
        mentor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            mentor_profile: {
              select: {
                domain: true,
              },
            },
          },
        },
      },
      orderBy: [{ booking_date: 'desc' }, { created_at: 'desc' }],
    });

    if (!recentBooking?.mentor) {
      return null;
    }

    return {
      mentorId: recentBooking.mentor.id,
      fullName:
        `${recentBooking.mentor.first_name} ${recentBooking.mentor.last_name}`.trim(),
      avatarUrl: recentBooking.mentor.avatar_url ?? null,
      domain: recentBooking.mentor.mentor_profile?.domain ?? 'Mentorat',
    };
  }

  async listMentorStudents(mentorId: string) {
    await this.assertMentorProfile(mentorId);

    const [acceptedRequests, bookings] = await Promise.all([
      this.prisma.mentor_requests.findMany({
        where: {
          mentor_id: mentorId,
          status: mentor_request_status.accepted,
        },
        include: {
          student: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.bookings.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            in: [booking_status.confirmed, booking_status.completed],
          },
        },
        include: {
          student: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: [{ booking_date: 'desc' }, { created_at: 'desc' }],
      }),
    ]);

    const students = new Map<
      string,
      {
        studentId: string;
        fullName: string;
        avatarUrl: string | null;
        relationSource: 'request' | 'booking';
      }
    >();

    for (const request of acceptedRequests) {
      students.set(request.student.id, {
        studentId: request.student.id,
        fullName:
          `${request.student.first_name} ${request.student.last_name}`.trim(),
        avatarUrl: request.student.avatar_url ?? null,
        relationSource: 'request',
      });
    }

    for (const booking of bookings) {
      if (students.has(booking.student.id)) {
        continue;
      }

      students.set(booking.student.id, {
        studentId: booking.student.id,
        fullName:
          `${booking.student.first_name} ${booking.student.last_name}`.trim(),
        avatarUrl: booking.student.avatar_url ?? null,
        relationSource: 'booking',
      });
    }

    return {
      students: [...students.values()],
    };
  }

  async updateMentorRequest(
    mentorId: string,
    requestId: string,
    input: { status: 'accepted' | 'rejected'; reason?: string },
  ) {
    const row = await this.prisma.mentor_requests.findUnique({
      where: { id: requestId },
    });

    if (!row) {
      throw new NotFoundException({
        code: 'MENTOR_REQUEST_NOT_FOUND',
        message: 'Demande introuvable',
      });
    }
    if (row.mentor_id !== mentorId) {
      throw new ForbiddenException({
        code: 'MENTOR_REQUEST_FORBIDDEN',
        message: 'Acces refuse a cette demande',
      });
    }

    const updated = await this.prisma.mentor_requests.update({
      where: { id: requestId },
      data: {
        status: input.status,
        decision_reason: input.reason?.trim() || null,
      },
    });

    await this.safeNotify(updated.student_id, {
      title:
        input.status === 'accepted'
          ? 'Demande mentor acceptee'
          : 'Demande mentor refusee',
      message:
        input.status === 'accepted'
          ? 'Votre demande a ete acceptee'
          : `Votre demande a ete refusee${input.reason ? `: ${input.reason}` : ''}`,
      payload: {
        requestId: updated.id,
        status: updated.status,
        reason: updated.decision_reason,
      },
    });

    return {
      request: {
        requestId: updated.id,
        status: updated.status,
        decisionReason: updated.decision_reason,
        updatedAt: updated.updated_at.toISOString(),
      },
    };
  }

  async createProgramTemplate(
    mentorId: string,
    input: {
      title: string;
      description?: string;
      milestones: Array<{
        title: string;
        description?: string;
        dueDaysFromStart: number;
      }>;
    },
  ) {
    if (!input.title.trim()) {
      throw new BadRequestException({
        code: 'TEMPLATE_TITLE_REQUIRED',
        message: 'Le titre est requis',
      });
    }
    if (
      !Array.isArray(input.milestones) ||
      input.milestones.length === 0 ||
      input.milestones.length > 20
    ) {
      throw new BadRequestException({
        code: 'INVALID_TEMPLATE_MILESTONES',
        message: 'Le template doit contenir entre 1 et 20 jalons',
      });
    }

    const template = await this.prisma.program_templates.create({
      data: {
        mentor_id: mentorId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
      },
    });

    for (let index = 0; index < input.milestones.length; index += 1) {
      const milestone = input.milestones[index];
      if (!milestone.title.trim()) {
        throw new BadRequestException({
          code: 'MILESTONE_TITLE_REQUIRED',
          message: 'Chaque jalon doit avoir un titre',
        });
      }
      await this.prisma.program_template_milestones.create({
        data: {
          template_id: template.id,
          title: milestone.title.trim(),
          description: milestone.description?.trim() || null,
          milestone_order: index + 1,
          due_days_from_start: Math.max(1, milestone.dueDaysFromStart),
        },
      });
    }

    return this.getProgramTemplateById(mentorId, template.id);
  }

  async listProgramTemplates(mentorId: string) {
    const templates = await this.prisma.program_templates.findMany({
      where: { mentor_id: mentorId },
      include: {
        milestones: { orderBy: { milestone_order: 'asc' } },
      },
      orderBy: { updated_at: 'desc' },
    });

    return {
      templates: templates.map((template) => ({
        templateId: template.id,
        title: template.title,
        description: template.description,
        milestones: template.milestones.map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.milestone_order,
          dueDaysFromStart: milestone.due_days_from_start,
        })),
      })),
    };
  }

  async updateProgramTemplate(
    mentorId: string,
    templateId: string,
    input: {
      title?: string;
      description?: string;
      milestones?: Array<{
        title: string;
        description?: string;
        dueDaysFromStart: number;
      }>;
    },
  ) {
    const template = await this.prisma.program_templates.findUnique({
      where: { id: templateId },
      select: { mentor_id: true },
    });

    if (!template) {
      throw new NotFoundException({
        code: 'PROGRAM_TEMPLATE_NOT_FOUND',
        message: 'Template introuvable',
      });
    }
    if (template.mentor_id !== mentorId) {
      throw new ForbiddenException({
        code: 'PROGRAM_TEMPLATE_FORBIDDEN',
        message: 'Acces refuse au template',
      });
    }

    await this.prisma.program_templates.update({
      where: { id: templateId },
      data: {
        title: input.title?.trim() || undefined,
        description:
          input.description !== undefined
            ? input.description.trim() || null
            : undefined,
      },
    });

    if (input.milestones) {
      if (input.milestones.length === 0 || input.milestones.length > 20) {
        throw new BadRequestException({
          code: 'INVALID_TEMPLATE_MILESTONES',
          message: 'Le template doit contenir entre 1 et 20 jalons',
        });
      }
      await this.prisma.program_template_milestones.deleteMany({
        where: { template_id: templateId },
      });
      for (let index = 0; index < input.milestones.length; index += 1) {
        const milestone = input.milestones[index];
        await this.prisma.program_template_milestones.create({
          data: {
            template_id: templateId,
            title: milestone.title.trim(),
            description: milestone.description?.trim() || null,
            milestone_order: index + 1,
            due_days_from_start: Math.max(1, milestone.dueDaysFromStart),
          },
        });
      }
    }

    return this.getProgramTemplateById(mentorId, templateId);
  }

  async assignProgramToStudent(
    mentorId: string,
    studentId: string,
    input: { templateId: string; title?: string; startAt?: string },
  ) {
    await this.assertMentorStudentRelation(mentorId, studentId);

    const template = await this.prisma.program_templates.findUnique({
      where: { id: input.templateId },
      include: { milestones: { orderBy: { milestone_order: 'asc' } } },
    });

    if (!template || template.mentor_id !== mentorId) {
      throw new NotFoundException({
        code: 'PROGRAM_TEMPLATE_NOT_FOUND',
        message: 'Template introuvable',
      });
    }

    const startAt = input.startAt ? new Date(input.startAt) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_START_AT',
        message: 'Date de debut invalide',
      });
    }

    const program = await this.prisma.student_programs.create({
      data: {
        template_id: template.id,
        mentor_id: mentorId,
        student_id: studentId,
        title: input.title?.trim() || template.title,
        start_at: startAt,
      },
    });

    for (const milestone of template.milestones) {
      const deadlineAt = new Date(startAt);
      deadlineAt.setDate(deadlineAt.getDate() + milestone.due_days_from_start);

      await this.prisma.student_program_milestones.create({
        data: {
          program_id: program.id,
          title: milestone.title,
          description: milestone.description,
          milestone_order: milestone.milestone_order,
          deadline_at: deadlineAt,
          status: program_milestone_status.planned,
        },
      });
    }

    return this.getProgramById(program.id, mentorId);
  }

  async listPrograms(mentorId: string, studentId?: string) {
    const rows = await this.prisma.student_programs.findMany({
      where: {
        mentor_id: mentorId,
        ...(studentId ? { student_id: studentId } : {}),
      },
      include: {
        student: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        milestones: { orderBy: { milestone_order: 'asc' } },
      },
      orderBy: { updated_at: 'desc' },
    });

    return {
      programs: rows.map((program) => ({
        programId: program.id,
        templateId: program.template_id,
        mentorId: program.mentor_id,
        studentId: program.student_id,
        studentName:
          `${program.student.first_name} ${program.student.last_name}`.trim(),
        title: program.title,
        status: program.status,
        startAt: program.start_at.toISOString(),
        milestones: program.milestones.map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.milestone_order,
          deadlineAt: milestone.deadline_at.toISOString(),
          status: milestone.status,
        })),
      })),
    };
  }

  async updateProgramMilestone(
    mentorId: string,
    milestoneId: string,
    input: {
      status?: 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';
      deadlineAt?: string;
    },
  ) {
    const row = await this.prisma.student_program_milestones.findUnique({
      where: { id: milestoneId },
      include: { program: true },
    });

    if (!row) {
      throw new NotFoundException({
        code: 'PROGRAM_MILESTONE_NOT_FOUND',
        message: 'Jalon introuvable',
      });
    }

    if (row.program.mentor_id !== mentorId) {
      throw new ForbiddenException({
        code: 'PROGRAM_MILESTONE_FORBIDDEN',
        message: 'Acces refuse au jalon',
      });
    }

    const deadlineAt = input.deadlineAt
      ? new Date(input.deadlineAt)
      : undefined;
    if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_DEADLINE',
        message: 'Deadline invalide',
      });
    }

    const updated = await this.prisma.student_program_milestones.update({
      where: { id: milestoneId },
      data: {
        status: input.status,
        deadline_at: deadlineAt,
      },
    });

    return {
      milestone: {
        milestoneId: updated.id,
        status: updated.status,
        deadlineAt: updated.deadline_at.toISOString(),
        updatedAt: updated.updated_at.toISOString(),
      },
    };
  }

  async uploadProgramDocument(
    actorId: string,
    programId: string,
    input: {
      url: string;
      type?: 'memory' | 'brief' | 'annex' | 'other';
      fileName?: string;
    },
  ) {
    this.assertHttpsUrl(input.url, 'url');

    const program = await this.assertProgramAccess(actorId, programId);

    const created = await this.prisma.program_documents.create({
      data: {
        program_id: program.id,
        uploaded_by: actorId,
        document_type: input.type ?? 'other',
        file_name: input.fileName?.trim() || null,
        url: input.url,
      },
    });

    return {
      document: {
        documentId: created.id,
        type: created.document_type,
        fileName: created.file_name,
        uploadedBy: created.uploaded_by,
        createdAt: created.created_at.toISOString(),
      },
    };
  }

  async listProgramDocuments(actorId: string, programId: string) {
    await this.assertProgramAccess(actorId, programId);

    const rows = await this.prisma.program_documents.findMany({
      where: { program_id: programId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    return {
      documents: rows.map((row) => ({
        documentId: row.id,
        type: row.document_type,
        fileName: row.file_name,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at.toISOString(),
        downloadUrl: `${row.url}?downloadToken=${Buffer.from(`${row.id}:${Date.now()}`, 'utf-8').toString('base64')}`,
      })),
    };
  }

  async deleteProgramDocument(
    actorId: string,
    programId: string,
    documentId: string,
  ) {
    const program = await this.assertProgramAccess(actorId, programId);
    const row = await this.prisma.program_documents.findUnique({
      where: { id: documentId },
    });

    if (!row || row.program_id !== program.id || row.deleted_at) {
      throw new NotFoundException({
        code: 'PROGRAM_DOCUMENT_NOT_FOUND',
        message: 'Document introuvable',
      });
    }

    if (row.uploaded_by !== actorId && actorId !== program.mentor_id) {
      throw new ForbiddenException({
        code: 'PROGRAM_DOCUMENT_FORBIDDEN',
        message: 'Suppression non autorisee',
      });
    }

    await this.prisma.program_documents.update({
      where: { id: documentId },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  private async assertMentorProfile(mentorId: string) {
    const mentor = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: mentorId },
      select: { user_id: true },
    });
    if (!mentor) {
      throw new NotFoundException({
        code: 'MENTOR_NOT_FOUND',
        message: 'Mentor introuvable',
      });
    }
    return mentor;
  }

  private async assertMentorStudentRelation(
    mentorId: string,
    studentId: string,
  ) {
    const [bookingRelation, requestRelation] = await Promise.all([
      this.prisma.bookings.findFirst({
        where: { mentor_id: mentorId, student_id: studentId },
        select: { id: true },
      }),
      this.prisma.mentor_requests.findFirst({
        where: {
          mentor_id: mentorId,
          student_id: studentId,
          status: mentor_request_status.accepted,
        },
        select: { id: true },
      }),
    ]);

    if (!bookingRelation && !requestRelation) {
      throw new ForbiddenException({
        code: 'MENTOR_STUDENT_RELATION_REQUIRED',
        message: 'Aucune relation active mentor-etudiant',
      });
    }
  }

  private async assertProgramAccess(actorId: string, programId: string) {
    const program = await this.prisma.student_programs.findUnique({
      where: { id: programId },
      select: {
        id: true,
        mentor_id: true,
        student_id: true,
      },
    });

    if (!program) {
      throw new NotFoundException({
        code: 'PROGRAM_NOT_FOUND',
        message: 'Parcours introuvable',
      });
    }

    if (program.mentor_id !== actorId && program.student_id !== actorId) {
      throw new ForbiddenException({
        code: 'PROGRAM_ACCESS_FORBIDDEN',
        message: 'Acces refuse au parcours',
      });
    }

    return program;
  }

  private assertHttpsUrl(url: string, field: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new BadRequestException({
        code: 'INVALID_URL',
        message: `${field} doit etre une URL https valide`,
      });
    }
  }

  private async getProgramTemplateById(mentorId: string, templateId: string) {
    const template = await this.prisma.program_templates.findUnique({
      where: { id: templateId },
      include: { milestones: { orderBy: { milestone_order: 'asc' } } },
    });

    if (!template || template.mentor_id !== mentorId) {
      throw new NotFoundException({
        code: 'PROGRAM_TEMPLATE_NOT_FOUND',
        message: 'Template introuvable',
      });
    }

    return {
      template: {
        templateId: template.id,
        title: template.title,
        description: template.description,
        milestones: template.milestones.map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.milestone_order,
          dueDaysFromStart: milestone.due_days_from_start,
        })),
      },
    };
  }

  private async getProgramById(programId: string, mentorId: string) {
    const program = await this.prisma.student_programs.findUnique({
      where: { id: programId },
      include: { milestones: { orderBy: { milestone_order: 'asc' } } },
    });

    if (!program || program.mentor_id !== mentorId) {
      throw new NotFoundException({
        code: 'PROGRAM_NOT_FOUND',
        message: 'Parcours introuvable',
      });
    }

    return {
      program: {
        programId: program.id,
        templateId: program.template_id,
        mentorId: program.mentor_id,
        studentId: program.student_id,
        title: program.title,
        status: program.status,
        startAt: program.start_at.toISOString(),
        milestones: program.milestones.map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.milestone_order,
          deadlineAt: milestone.deadline_at.toISOString(),
          status: milestone.status,
        })),
      },
    };
  }

  private async recomputePublishReadiness(mentorId: string) {
    const mentor = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: mentorId },
      include: { user: { select: { avatar_url: true } } },
    });

    if (!mentor) return;

    const docsCount = await this.prisma.mentor_documents.count({
      where: {
        mentor_id: mentorId,
        deleted_at: null,
        verification_status: { in: ['pending', 'verified'] },
      },
    });

    const isReady =
      Boolean(mentor.about?.trim()) &&
      (mentor.professional_links?.length ?? 0) > 0 &&
      Boolean(mentor.banner_url || mentor.user.avatar_url) &&
      Boolean(mentor.domain?.trim()) &&
      (mentor.expertise_tags?.length ?? 0) > 0 &&
      Boolean(mentor.education_level) &&
      (mentor.support_types?.length ?? 0) > 0 &&
      mentor.hourly_rate !== null &&
      docsCount > 0;

    if (mentor.is_publish_ready !== isReady) {
      await this.prisma.mentor_profiles.update({
        where: { user_id: mentorId },
        data: { is_publish_ready: isReady },
      });
    }
  }

  private async safeNotify(
    userId: string,
    input: { title: string; message: string; payload: Record<string, unknown> },
  ) {
    try {
      await this.notifications.emitNotification({
        userId,
        channel: 'in_app',
        category: 'messages',
        title: input.title,
        message: input.message,
        payload: input.payload,
      });
    } catch {
      // Notification failures must not break business flow
    }
  }
}
