import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import {
  CreateMentorSelfProfileDto,
  MentorAvailabilitySlotDto,
  MentorTariffsDto,
  UpdateMentorSelfProfileDto,
} from './dto';

type MentorMeta = {
  languages: string[];
  certifications: string[];
  tariffs: MentorTariffsDto;
  availabilitySlots: MentorAvailabilitySlotDto[];
};

interface MentorSelfProfileResponse {
  profile: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
    educationLevel: string | null;
    degrees: string[];
    keywords: string[];
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    supportTypes: string[];
    languages: string[];
    certifications: string[];
    tariffs: MentorTariffsDto;
    availability: {
      isAvailable: boolean;
      nextAvailableAt: string | null;
      slots: MentorAvailabilitySlotDto[];
    };
    isPublished: boolean;
    updatedAt: string;
  };
}

const DEFAULT_CURRENCY = 'EUR';
const ALLOWED_PROFESSIONAL_LINK_DOMAINS = ['linkedin.com'];

@Injectable()
export class MentorsSelfService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<MentorSelfProfileResponse> {
    await this.assertMentorRole(userId);

    const mentor = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            bio: true,
            avatar_url: true,
          },
        },
        availability: true,
      },
    });

    if (!mentor) {
      throw new NotFoundException({
        code: 'MENTOR_PROFILE_NOT_FOUND',
        message: 'Profil mentor introuvable',
      });
    }

    const metadata = await this.loadMentorMetadata(userId, mentor.hourly_rate);
    return this.mapMentorToResponse(mentor, metadata);
  }

  async createMyProfile(
    userId: string,
    dto: CreateMentorSelfProfileDto,
  ): Promise<MentorSelfProfileResponse> {
    await this.assertMentorRole(userId);
    this.assertProfessionalLinks(dto.professionalLinks);
    this.assertTariffs(dto.tariffs);
    this.assertAvailability(
      dto.availability.nextAvailableAt,
      dto.availability.slots,
    );

    const existing = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'MENTOR_PROFILE_ALREADY_EXISTS',
        message: 'Le profil mentor existe deja, utilisez PATCH /mentors/me',
      });
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        bio: dto.bio,
      },
    });

    await this.prisma.mentor_profiles.create({
      data: {
        user_id: userId,
        banner_url: dto.bannerUrl,
        about: dto.about,
        education_level: dto.educationLevel,
        degrees: this.cleanCaseInsensitive(dto.degrees ?? []),
        keywords: this.cleanTags(dto.keywords ?? []).map((keyword) =>
          keyword.toLowerCase(),
        ),
        professional_links: this.cleanTags(dto.professionalLinks ?? []),
        domain: dto.domain,
        expertise_tags: this.cleanTags(dto.expertiseTags),
        supported_levels: this.cleanTags(dto.supportedLevels ?? []),
        support_types: this.cleanSupportTypes(dto.supportTypes ?? []),
        hourly_rate: dto.tariffs.min,
        is_validated: true,
      },
    });

    await this.prisma.mentor_availability.upsert({
      where: { mentor_user_id: userId },
      update: {
        is_available: dto.availability.isAvailable,
        next_available_at: dto.availability.nextAvailableAt
          ? new Date(dto.availability.nextAvailableAt)
          : null,
      },
      create: {
        mentor_user_id: userId,
        is_available: dto.availability.isAvailable,
        next_available_at: dto.availability.nextAvailableAt
          ? new Date(dto.availability.nextAvailableAt)
          : null,
      },
    });

    await this.saveMentorMetadata(userId, {
      languages: this.cleanTags(dto.languages ?? []),
      certifications: this.cleanTags(dto.certifications ?? []),
      tariffs: dto.tariffs,
      availabilitySlots: dto.availability.slots ?? [],
    });

    await this.refreshPublishReadiness(userId);

    return this.getMyProfile(userId);
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateMentorSelfProfileDto,
  ): Promise<MentorSelfProfileResponse> {
    await this.assertMentorRole(userId);

    const existing = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            bio: true,
            avatar_url: true,
          },
        },
        availability: true,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'MENTOR_PROFILE_NOT_FOUND',
        message: 'Profil mentor introuvable',
      });
    }

    const currentMeta = await this.loadMentorMetadata(
      userId,
      existing.hourly_rate,
    );

    if (dto.tariffs) {
      this.assertTariffs(dto.tariffs);
    }
    if (dto.professionalLinks) {
      this.assertProfessionalLinks(dto.professionalLinks);
    }

    const nextSlots = dto.availability?.slots ?? currentMeta.availabilitySlots;
    const nextNextAvailableAt =
      dto.availability?.nextAvailableAt ??
      existing.availability?.next_available_at?.toISOString();
    this.assertAvailability(nextNextAvailableAt, nextSlots);

    const profileData: {
      banner_url?: string | null;
      about?: string | null;
      education_level?: string | null;
      degrees?: string[];
      keywords?: string[];
      professional_links?: string[];
      domain?: string;
      expertise_tags?: string[];
      supported_levels?: string[];
      support_types?: ('ponctuel' | 'suivi_regulier' | 'long_uniquement')[];
      hourly_rate?: number;
      is_validated?: boolean;
    } = {};

    if (dto.domain !== undefined) {
      profileData.domain = dto.domain;
    }
    if (dto.bannerUrl !== undefined) {
      profileData.banner_url = dto.bannerUrl || null;
    }
    if (dto.about !== undefined) {
      profileData.about = dto.about || null;
    }
    if (dto.educationLevel !== undefined) {
      profileData.education_level = dto.educationLevel || null;
    }
    if (dto.degrees !== undefined) {
      profileData.degrees = this.cleanCaseInsensitive(dto.degrees);
    }
    if (dto.keywords !== undefined) {
      profileData.keywords = this.cleanTags(dto.keywords).map((keyword) =>
        keyword.toLowerCase(),
      );
    }
    if (dto.professionalLinks !== undefined) {
      profileData.professional_links = this.cleanTags(dto.professionalLinks);
    }
    if (dto.expertiseTags !== undefined) {
      profileData.expertise_tags = this.cleanTags(dto.expertiseTags);
    }
    if (dto.supportedLevels !== undefined) {
      profileData.supported_levels = this.cleanTags(dto.supportedLevels);
    }
    if (dto.supportTypes !== undefined) {
      profileData.support_types = this.cleanSupportTypes(dto.supportTypes);
    }
    if (dto.tariffs !== undefined) {
      profileData.hourly_rate = dto.tariffs.min;
    }
    profileData.is_validated = true;

    await this.prisma.mentor_profiles.update({
      where: { user_id: userId },
      data: profileData,
    });

    if (dto.bio !== undefined) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { bio: dto.bio },
      });
    }

    if (dto.availability) {
      await this.prisma.mentor_availability.upsert({
        where: { mentor_user_id: userId },
        update: {
          is_available: dto.availability.isAvailable,
          next_available_at: dto.availability.nextAvailableAt
            ? new Date(dto.availability.nextAvailableAt)
            : null,
        },
        create: {
          mentor_user_id: userId,
          is_available: dto.availability.isAvailable,
          next_available_at: dto.availability.nextAvailableAt
            ? new Date(dto.availability.nextAvailableAt)
            : null,
        },
      });
    }

    await this.saveMentorMetadata(userId, {
      languages:
        dto.languages !== undefined
          ? this.cleanTags(dto.languages)
          : currentMeta.languages,
      certifications:
        dto.certifications !== undefined
          ? this.cleanTags(dto.certifications)
          : currentMeta.certifications,
      tariffs: dto.tariffs ?? currentMeta.tariffs,
      availabilitySlots: nextSlots,
    });

    await this.refreshPublishReadiness(userId);

    return this.getMyProfile(userId);
  }

  async getPublishReadiness(userId: string): Promise<{
    isPublishReady: boolean;
    missingRequirements: string[];
  }> {
    await this.assertMentorRole(userId);
    const readiness = await this.refreshPublishReadiness(userId);
    return {
      isPublishReady: readiness.isPublishReady,
      missingRequirements: readiness.missingRequirements,
    };
  }

  private async assertMentorRole(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    const hasMentorRole = user.user_roles.some(
      (entry) => entry.role.name === 'mentor',
    );
    if (!hasMentorRole) {
      throw new ForbiddenException({
        code: 'MENTOR_ROLE_REQUIRED',
        message: 'Seuls les mentors peuvent modifier ce profil',
      });
    }
  }

  private assertTariffs(tariffs: MentorTariffsDto): void {
    if (tariffs.min >= tariffs.max) {
      throw new BadRequestException({
        code: 'INVALID_TARIFF_RANGE',
        message: 'Le tarif minimum doit etre strictement inferieur au maximum',
      });
    }
  }

  private assertProfessionalLinks(links?: string[]): void {
    if (!links || links.length === 0) {
      return;
    }

    for (const link of links) {
      let hostname = '';
      try {
        const url = new URL(link);
        hostname = url.hostname.toLowerCase();
      } catch {
        throw new BadRequestException({
          code: 'INVALID_PROFESSIONAL_LINK',
          message: `Lien professionnel invalide: ${link}`,
        });
      }

      const authorized = ALLOWED_PROFESSIONAL_LINK_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );

      if (!authorized) {
        throw new BadRequestException({
          code: 'INVALID_PROFESSIONAL_LINK_DOMAIN',
          message:
            'Seuls les liens professionnels LinkedIn sont autorises pour le moment',
        });
      }
    }
  }

  private assertAvailability(
    nextAvailableAt?: string,
    slots: MentorAvailabilitySlotDto[] = [],
  ): void {
    if (nextAvailableAt && !nextAvailableAt.endsWith('Z')) {
      throw new BadRequestException({
        code: 'INVALID_AVAILABILITY_TIMEZONE',
        message: 'nextAvailableAt doit etre en UTC (suffixe Z)',
      });
    }

    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException({
          code: 'INVALID_AVAILABILITY_SLOT',
          message:
            'Chaque plage de disponibilite doit avoir startTime < endTime',
        });
      }
    }
  }

  private cleanTags(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private cleanCaseInsensitive(values: string[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const raw of values) {
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(value);
    }
    return output;
  }

  private cleanSupportTypes(values: string[]): (
    | 'ponctuel'
    | 'suivi_regulier'
    | 'long_uniquement'
  )[] {
    return [
      ...new Set(
        values.filter(
          (value): value is 'ponctuel' | 'suivi_regulier' | 'long_uniquement' =>
            value === 'ponctuel' ||
            value === 'suivi_regulier' ||
            value === 'long_uniquement',
        ),
      ),
    ];
  }

  private async loadMentorMetadata(
    userId: string,
    hourlyRate: number | null,
  ): Promise<MentorMeta> {
    const row = await this.prisma.user_needs.findUnique({
      where: { user_id: userId },
    });

    const payload = (row?.needs_json ?? {}) as Record<string, unknown>;
    const stored = (payload.mentorProfile ?? {}) as Record<string, unknown>;

    const tariffs = stored.tariffs as Partial<MentorTariffsDto> | undefined;

    return {
      languages: this.cleanTags((stored.languages as string[]) ?? []),
      certifications: this.cleanTags((stored.certifications as string[]) ?? []),
      tariffs: {
        min: Number.isInteger(tariffs?.min)
          ? (tariffs?.min as number)
          : (hourlyRate ?? 30),
        max: Number.isInteger(tariffs?.max)
          ? (tariffs?.max as number)
          : Math.max(hourlyRate ?? 30, (hourlyRate ?? 30) + 10),
        currency:
          typeof tariffs?.currency === 'string'
            ? tariffs.currency
            : DEFAULT_CURRENCY,
      },
      availabilitySlots:
        (stored.availabilitySlots as MentorAvailabilitySlotDto[]) ?? [],
    };
  }

  private async saveMentorMetadata(
    userId: string,
    metadata: MentorMeta,
  ): Promise<void> {
    this.assertTariffs(metadata.tariffs);
    this.assertAvailability(undefined, metadata.availabilitySlots);

    const row = await this.prisma.user_needs.findUnique({
      where: { user_id: userId },
    });
    const baseRaw = row?.needs_json;
    const base: Prisma.InputJsonObject =
      baseRaw &&
      typeof baseRaw === 'object' &&
      !Array.isArray(baseRaw) &&
      baseRaw !== null
        ? ({ ...baseRaw } as Prisma.InputJsonObject)
        : {};

    const mentorProfile: Prisma.InputJsonObject = {
      languages: metadata.languages,
      certifications: metadata.certifications,
      tariffs: {
        min: metadata.tariffs.min,
        max: metadata.tariffs.max,
        currency: metadata.tariffs.currency,
      },
      availabilitySlots: metadata.availabilitySlots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    };

    const nextPayload: Prisma.InputJsonObject = {
      ...base,
      mentorProfile,
    };

    await this.prisma.user_needs.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        needs_json: nextPayload,
        needs_updated: true,
      },
      update: {
        needs_json: nextPayload,
        needs_updated: true,
      },
    });
  }

  private mapMentorToResponse(
    mentor: {
      user_id: string;
      banner_url: string | null;
      about: string | null;
      education_level: string | null;
      degrees: string[];
      keywords: string[];
      professional_links: string[];
      domain: string;
      expertise_tags: string[];
      supported_levels: string[];
      support_types: ('ponctuel' | 'suivi_regulier' | 'long_uniquement')[];
      hourly_rate: number | null;
      is_publish_ready: boolean;
      is_validated: boolean;
      updated_at: Date;
      user: {
        first_name: string;
        last_name: string;
        bio: string | null;
        avatar_url?: string | null;
      };
      availability: {
        is_available: boolean;
        next_available_at: Date | null;
      } | null;
    },
    metadata: MentorMeta,
  ): MentorSelfProfileResponse {
    return {
      profile: {
        mentorId: mentor.user_id,
        fullName: `${mentor.user.first_name} ${mentor.user.last_name}`,
        bio: mentor.user.bio,
        bannerUrl: mentor.banner_url ?? null,
        about: mentor.about ?? null,
        professionalLinks: mentor.professional_links ?? [],
        educationLevel: mentor.education_level ?? null,
        degrees: mentor.degrees ?? [],
        keywords: mentor.keywords ?? [],
        domain: mentor.domain,
        expertiseTags: mentor.expertise_tags,
        supportedLevels: mentor.supported_levels,
        supportTypes: mentor.support_types ?? [],
        languages: metadata.languages,
        certifications: metadata.certifications,
        tariffs: metadata.tariffs,
        availability: {
          isAvailable: mentor.availability?.is_available ?? false,
          nextAvailableAt:
            mentor.availability?.next_available_at?.toISOString() ?? null,
          slots: metadata.availabilitySlots,
        },
        isPublished: mentor.is_publish_ready && mentor.is_validated,
        updatedAt: mentor.updated_at.toISOString(),
      },
    };
  }

  private async refreshPublishReadiness(userId: string): Promise<{
    isPublishReady: boolean;
    missingRequirements: string[];
  }> {
    const mentor = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: userId },
      include: {
        user: { select: { avatar_url: true } },
      },
    });

    if (!mentor) {
      return { isPublishReady: false, missingRequirements: ['profile'] };
    }

    const missingRequirements: string[] = [];

    if (!mentor.about?.trim()) missingRequirements.push('about');
    if (!mentor.banner_url && !mentor.user.avatar_url)
      missingRequirements.push('banner_or_avatar');
    if (!mentor.domain?.trim()) missingRequirements.push('domain');
    if ((mentor.expertise_tags?.length ?? 0) < 1)
      missingRequirements.push('expertise_tags');
    if ((mentor.support_types?.length ?? 0) < 1)
      missingRequirements.push('support_types');
    if (mentor.hourly_rate === null) missingRequirements.push('tariff');

    const isPublishReady = missingRequirements.length === 0;

    if (mentor.is_publish_ready !== isPublishReady) {
      await this.prisma.mentor_profiles.update({
        where: { user_id: userId },
        data: { is_publish_ready: isPublishReady },
      });
    }

    return { isPublishReady, missingRequirements };
  }
}
