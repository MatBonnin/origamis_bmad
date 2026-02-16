import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

export interface ProfileSuggestion {
  level: string;
  objectives: string[];
  bio: string;
}

interface OnboardingAnswers {
  domain?: string;
  level?: string;
  graduationYear?: string;
  objectives?: string[];
  profileType?: string;
}

const DOMAIN_BIO_MAP: Record<string, string> = {
  informatique:
    'Etudiant(e) en informatique, passionne(e) par la technologie et le developpement.',
  commerce:
    'Etudiant(e) en commerce, motive(e) par le marketing et la strategie.',
  droit: 'Etudiant(e) en droit, interesse(e) par la justice et la legislation.',
  sciences:
    'Etudiant(e) en sciences, curieux(se) et rigoureux(se) dans la recherche.',
  sante:
    'Etudiant(e) en sante, dedie(e) au bien-etre et aux soins des personnes.',
  'art-design':
    'Etudiant(e) en art et design, creatif(ve) et attentif(ve) aux details.',
  communication:
    'Etudiant(e) en communication, a l aise avec les medias et la creation de contenu.',
  ingenierie:
    'Etudiant(e) en ingenierie, oriente(e) vers la resolution de problemes techniques.',
  lettres:
    'Etudiant(e) en lettres, passionne(e) par la langue et la culture.',
  economie:
    'Etudiant(e) en economie, interesse(e) par la gestion et l analyse financiere.',
};

const DEFAULT_BIO = 'Etudiant(e) motive(e) et pret(e) a progresser.';

const LEVEL_MAP: Record<string, string> = {
  'licence-1': 'debutant',
  'licence-2': 'debutant',
  'licence-3': 'intermediaire',
  'master-1': 'intermediaire',
  'master-2': 'avance',
  doctorat: 'avance',
  'bts-dut': 'intermediaire',
  prepa: 'intermediaire',
};

const DEFAULT_OBJECTIVES = ['career-guidance', 'time-management'];

@Injectable()
export class ProfileSuggestionService {
  constructor(private readonly prisma: PrismaService) {}

  generateSuggestion(answers: OnboardingAnswers): ProfileSuggestion {
    const level = answers.level
      ? LEVEL_MAP[answers.level] || 'intermediaire'
      : 'intermediaire';

    const objectives =
      answers.objectives && answers.objectives.length > 0
        ? answers.objectives
        : DEFAULT_OBJECTIVES;

    const bio = answers.domain
      ? DOMAIN_BIO_MAP[answers.domain] || DEFAULT_BIO
      : DEFAULT_BIO;

    return { level, objectives, bio };
  }

  async getSuggestion(
    userId: string,
  ): Promise<{ suggestion: ProfileSuggestion; accepted: boolean }> {
    await this.assertUserExists(userId);

    // Check if already stored
    const existing = await this.prisma.profile_suggestions.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      return {
        suggestion: existing.suggestion_json as unknown as ProfileSuggestion,
        accepted: Boolean(existing.accepted_at),
      };
    }

    // Load onboarding answers
    const onboarding = await this.prisma.onboarding.findUnique({
      where: { user_id: userId },
    });

    if (!onboarding || !onboarding.completed_at) {
      throw new BadRequestException({
        code: 'ONBOARDING_NOT_COMPLETED',
        message: 'L onboarding doit etre complete avant de proposer un profil',
      });
    }

    const answers = onboarding.answers_json as unknown as OnboardingAnswers;
    const suggestion = this.generateSuggestion(answers);

    // Persist the suggestion
    await this.prisma.profile_suggestions.create({
      data: {
        user_id: userId,
        suggestion_json: suggestion as unknown as Prisma.InputJsonValue,
      },
    });

    return { suggestion, accepted: false };
  }

  async acceptSuggestion(
    userId: string,
  ): Promise<{ profile: ProfileSuggestion }> {
    await this.assertUserExists(userId);

    const existing = await this.prisma.profile_suggestions.findUnique({
      where: { user_id: userId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'SUGGESTION_NOT_FOUND',
        message: 'Aucune suggestion trouvee. Recuperez d abord la suggestion.',
      });
    }

    const suggestion =
      existing.suggestion_json as unknown as ProfileSuggestion;

    // Update user profile with suggestion
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        level: suggestion.level,
        objectives: suggestion.objectives,
        bio: suggestion.bio,
      },
    });

    // Mark as accepted
    await this.prisma.profile_suggestions.update({
      where: { user_id: userId },
      data: { accepted_at: new Date() },
    });

    return { profile: suggestion };
  }

  async modifySuggestion(
    userId: string,
    modifications: Partial<ProfileSuggestion>,
  ): Promise<{ profile: ProfileSuggestion }> {
    await this.assertUserExists(userId);

    const existing = await this.prisma.profile_suggestions.findUnique({
      where: { user_id: userId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'SUGGESTION_NOT_FOUND',
        message: 'Aucune suggestion trouvee. Recuperez d abord la suggestion.',
      });
    }

    const originalSuggestion =
      existing.suggestion_json as unknown as ProfileSuggestion;
    const modifiedProfile: ProfileSuggestion = {
      ...originalSuggestion,
      ...modifications,
    };

    // Update user profile with modified values
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        level: modifiedProfile.level,
        objectives: modifiedProfile.objectives,
        bio: modifiedProfile.bio,
      },
    });

    // Update suggestion and mark as accepted
    await this.prisma.profile_suggestions.update({
      where: { user_id: userId },
      data: {
        suggestion_json:
          modifiedProfile as unknown as Prisma.InputJsonValue,
        accepted_at: new Date(),
      },
    });

    return { profile: modifiedProfile };
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }
  }
}
