import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class ReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchDomains(search?: string) {
    return this.prisma.domain_refs.findMany({
      where: search
        ? {
            OR: [
              { label: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
      take: 60,
    });
  }

  async searchSkills(search?: string, domain?: string) {
    return this.prisma.skill_refs.findMany({
      where: {
        ...(domain ? { domain_slug: domain } : {}),
        ...(search ? { label: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { label: 'asc' },
      take: 60,
    });
  }
}
