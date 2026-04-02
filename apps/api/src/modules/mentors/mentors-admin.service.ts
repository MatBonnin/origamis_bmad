import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

export type MentorValidationStatus =
  | 'pending_review'
  | 'validated'
  | 'rejected';
export type MentorVisibilityStatus =
  | 'visible'
  | 'hidden'
  | 'priority'
  | 'experimental';

@Injectable()
export class MentorsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingMentors(user: { roles: string[] }) {
    this.assertAdmin(user.roles);

    const mentors = await this.prisma.mentor_profiles.findMany({
      include: {
        user: {
          select: { first_name: true, last_name: true, email: true },
        },
        validation_checks: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
      take: 100,
    });

    const pending = mentors.filter((mentor) => {
      const status =
        mentor.validation_checks?.[0]?.status ??
        (mentor.is_validated ? 'validated' : 'pending_review');
      return status === 'pending_review';
    });

    return {
      mentors: pending.map((mentor) => {
        const latest = mentor.validation_checks?.[0];
        const status =
          latest?.status ??
          (mentor.is_validated ? 'validated' : 'pending_review');
        return {
          mentorId: mentor.user_id,
          fullName: `${mentor.user.first_name} ${mentor.user.last_name}`,
          email: mentor.user.email,
          domain: mentor.domain,
          status,
          notes: latest?.notes ?? '',
          updatedAt:
            latest?.updated_at.toISOString() ?? mentor.updated_at.toISOString(),
        };
      }),
    };
  }

  async validateMentor(
    user: { id: string; roles: string[] },
    mentorId: string,
    notes?: string,
  ) {
    return this.updateMentorStatus(user, mentorId, 'validated', notes);
  }

  async updateMentorStatus(
    user: { id: string; roles: string[] },
    mentorId: string,
    status: MentorValidationStatus,
    notes?: string,
  ) {
    this.assertAdmin(user.roles);
    await this.assertMentorExists(mentorId);

    const check = await this.prisma.mentor_validation_checks.create({
      data: {
        mentor_id: mentorId,
        status,
        checked_by: user.id,
        notes: notes?.trim() || '',
      },
    });

    await this.prisma.mentor_profiles.update({
      where: { user_id: mentorId },
      data: {
        is_validated: status === 'validated',
      },
    });

    return {
      mentor: {
        mentorId,
        status,
        notes: check.notes,
        checkedBy: user.id,
        updatedAt: check.updated_at.toISOString(),
      },
    };
  }

  async updateVisibility(
    user: { id: string; roles: string[] },
    mentorId: string,
    input: {
      status: MentorVisibilityStatus;
      effectiveFrom?: string;
      notes?: string;
    },
  ) {
    this.assertAdmin(user.roles);
    await this.assertMentorExists(mentorId);

    const validation = await this.getMentorValidationStatus(mentorId);
    if (validation !== 'validated' && input.status !== 'hidden') {
      throw new ForbiddenException({
        code: 'MENTOR_VISIBILITY_FORBIDDEN',
        message: 'Mentor non valide: visibilite restreinte a hidden',
      });
    }

    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();

    await this.prisma.mentor_visibility.upsert({
      where: { mentor_id: mentorId },
      create: {
        mentor_id: mentorId,
        status: input.status,
        effective_from: effectiveFrom,
        notes: input.notes?.trim() || '',
        updated_by: user.id,
      },
      update: {
        status: input.status,
        effective_from: effectiveFrom,
        notes: input.notes?.trim() || '',
        updated_by: user.id,
      },
    });

    await this.prisma.mentor_visibility_history.create({
      data: {
        mentor_id: mentorId,
        status: input.status,
        effective_from: effectiveFrom,
        notes: input.notes?.trim() || '',
        updated_by: user.id,
      },
    });

    return {
      mentor: {
        mentorId,
        visibility: input.status,
        effectiveFrom: effectiveFrom.toISOString(),
        notes: input.notes?.trim() || '',
      },
    };
  }

  async getVisibility(user: { roles: string[] }) {
    this.assertAdmin(user.roles);

    const mentors = await this.prisma.mentor_profiles.findMany({
      select: {
        user_id: true,
        domain: true,
        visibility: {
          select: {
            status: true,
            effective_from: true,
            notes: true,
          },
        },
      },
      take: 200,
    });

    return {
      visibilityRules: mentors.map((mentor) => ({
        mentorId: mentor.user_id,
        domain: mentor.domain,
        status: mentor.visibility?.status ?? 'visible',
        effectiveFrom: mentor.visibility?.effective_from?.toISOString() ?? null,
        notes: mentor.visibility?.notes ?? '',
      })),
    };
  }

  async getMentorVisibilityStatus(
    mentorId: string,
  ): Promise<MentorVisibilityStatus> {
    const row = await this.prisma.mentor_visibility.findUnique({
      where: { mentor_id: mentorId },
      select: { status: true },
    });
    return row?.status ?? 'visible';
  }

  async getMentorValidationStatus(
    mentorId: string,
  ): Promise<MentorValidationStatus> {
    const row = await this.prisma.mentor_validation_checks.findFirst({
      where: { mentor_id: mentorId },
      orderBy: { created_at: 'desc' },
      select: { status: true },
    });
    return row?.status ?? 'pending_review';
  }

  private async assertMentorExists(mentorId: string) {
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
  }

  private assertAdmin(roles: string[]) {
    if (!roles.includes('admin') && !roles.includes('support')) {
      throw new ForbiddenException({
        code: 'ADMIN_FORBIDDEN',
        message: 'Acces reserve aux admins',
      });
    }
  }
}
