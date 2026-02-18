import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

export type MentorValidationStatus = 'pending_review' | 'validated' | 'rejected';
export type MentorVisibilityStatus = 'visible' | 'hidden' | 'priority' | 'experimental';

interface ValidationRecord {
  mentorId: string;
  status: MentorValidationStatus;
  checkedBy: string;
  notes: string;
  updatedAt: string;
}

interface VisibilityRule {
  mentorId: string;
  status: MentorVisibilityStatus;
  effectiveFrom: string;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

@Injectable()
export class MentorsAdminService {
  private readonly validationRecords = new Map<string, ValidationRecord>();
  private readonly visibilityRules = new Map<string, VisibilityRule>();

  constructor(private readonly prisma: PrismaService) {}

  async getPendingMentors(user: { roles: string[] }) {
    this.assertAdmin(user.roles);

    const mentors = await this.prisma.mentor_profiles.findMany({
      include: {
        user: {
          select: { first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { updated_at: 'desc' },
      take: 100,
    });

    const pending = mentors.filter((mentor) => {
      const record = this.validationRecords.get(mentor.user_id);
      const status = record?.status ?? (mentor.is_validated ? 'validated' : 'pending_review');
      return status === 'pending_review';
    });

    return {
      mentors: pending.map((mentor) => {
        const record = this.validationRecords.get(mentor.user_id);
        return {
          mentorId: mentor.user_id,
          fullName: `${mentor.user.first_name} ${mentor.user.last_name}`,
          email: mentor.user.email,
          domain: mentor.domain,
          status: record?.status ?? (mentor.is_validated ? 'validated' : 'pending_review'),
          notes: record?.notes ?? '',
          updatedAt: record?.updatedAt ?? mentor.updated_at.toISOString(),
        };
      }),
    };
  }

  async validateMentor(
    user: { id: string; roles: string[] },
    mentorId: string,
    notes?: string,
  ) {
    this.assertAdmin(user.roles);
    await this.assertMentorExists(mentorId);

    const now = new Date().toISOString();
    const record: ValidationRecord = {
      mentorId,
      status: 'validated',
      checkedBy: user.id,
      notes: notes?.trim() || 'Profil valide',
      updatedAt: now,
    };

    this.validationRecords.set(mentorId, record);

    return {
      mentor: {
        mentorId,
        status: record.status,
        notes: record.notes,
        checkedBy: record.checkedBy,
        updatedAt: record.updatedAt,
      },
    };
  }

  async updateMentorStatus(
    user: { id: string; roles: string[] },
    mentorId: string,
    status: MentorValidationStatus,
    notes?: string,
  ) {
    this.assertAdmin(user.roles);
    await this.assertMentorExists(mentorId);

    const now = new Date().toISOString();

    const record: ValidationRecord = {
      mentorId,
      status,
      checkedBy: user.id,
      notes: notes?.trim() || '',
      updatedAt: now,
    };

    this.validationRecords.set(mentorId, record);

    return {
      mentor: {
        mentorId,
        status,
        notes: record.notes,
        checkedBy: user.id,
        updatedAt: now,
      },
    };
  }

  async updateVisibility(
    user: { id: string; roles: string[] },
    mentorId: string,
    input: { status: MentorVisibilityStatus; effectiveFrom?: string; notes?: string },
  ) {
    this.assertAdmin(user.roles);
    await this.assertMentorExists(mentorId);

    const validation = this.getMentorValidationStatus(mentorId);
    if (validation !== 'validated' && input.status !== 'hidden') {
      throw new ForbiddenException({
        code: 'MENTOR_VISIBILITY_FORBIDDEN',
        message: 'Mentor non valide: visibilite restreinte a hidden',
      });
    }

    const rule: VisibilityRule = {
      mentorId,
      status: input.status,
      effectiveFrom: input.effectiveFrom || new Date().toISOString(),
      notes: input.notes?.trim() || '',
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    this.visibilityRules.set(mentorId, rule);

    return {
      mentor: {
        mentorId,
        visibility: rule.status,
        effectiveFrom: rule.effectiveFrom,
        notes: rule.notes,
      },
    };
  }

  async getVisibility(user: { roles: string[] }) {
    this.assertAdmin(user.roles);

    const mentors = await this.prisma.mentor_profiles.findMany({
      select: {
        user_id: true,
        domain: true,
      },
      take: 200,
    });

    return {
      visibilityRules: mentors.map((mentor) => {
        const rule = this.visibilityRules.get(mentor.user_id);
        return {
          mentorId: mentor.user_id,
          domain: mentor.domain,
          status: rule?.status ?? 'visible',
          effectiveFrom: rule?.effectiveFrom ?? null,
          notes: rule?.notes ?? '',
        };
      }),
    };
  }

  getMentorVisibilityStatus(mentorId: string): MentorVisibilityStatus {
    return this.visibilityRules.get(mentorId)?.status ?? 'visible';
  }

  getMentorValidationStatus(mentorId: string): MentorValidationStatus {
    return this.validationRecords.get(mentorId)?.status ?? 'pending_review';
  }

  getMentorValidationOverride(mentorId: string): MentorValidationStatus | null {
    return this.validationRecords.get(mentorId)?.status ?? null;
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
