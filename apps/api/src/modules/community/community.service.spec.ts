import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;

  const mockPrisma = {
    consents: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
    jest.clearAllMocks();
    mockPrisma.consents.findFirst.mockResolvedValue({
      id: 'c-1',
      withdrawn_at: null,
    });
  });

  it('creates and lists posts', async () => {
    const created = await service.createPost(
      { id: 'student-1', roles: ['etudiant'] },
      { title: 'Titre', body: 'Contenu', tags: ['aide'] },
    );

    expect(created.post.status).toBe('published');

    const listed = await service.listPosts(
      { id: 'student-1', roles: ['etudiant'] },
      {},
    );

    expect(listed.posts).toHaveLength(1);
  });

  it('creates replies on post', async () => {
    const created = await service.createPost(
      { id: 'student-1', roles: ['etudiant'] },
      { title: 'Titre', body: 'Contenu' },
    );

    const reply = await service.createReply(
      { id: 'student-2', roles: ['etudiant'] },
      created.post.id,
      { body: 'Merci @student-1' },
    );

    expect(reply.reply.postId).toBe(created.post.id);
  });

  it('requires consent to publish', async () => {
    mockPrisma.consents.findFirst.mockResolvedValue({
      id: 'c-1',
      withdrawn_at: new Date(),
    });

    await expect(
      service.createPost(
        { id: 'student-1', roles: ['etudiant'] },
        { title: 'Titre', body: 'Contenu' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
