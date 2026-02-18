import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

export type CommunityPostStatus = 'published' | 'under_review' | 'removed';

export interface CommunityPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  status: CommunityPostStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

@Injectable()
export class CommunityService {
  private readonly posts = new Map<string, CommunityPost>();
  private readonly replies = new Map<string, CommunityReply[]>();

  constructor(private readonly prisma: PrismaService) {}

  async createPost(
    user: { id: string; roles: string[] },
    input: { title: string; body: string; tags?: string[] },
  ) {
    this.assertCommunityUser(user);
    await this.assertConsent(user.id);

    if (!input.title?.trim() || !input.body?.trim()) {
      throw new BadRequestException({
        code: 'POST_INVALID',
        message: 'Titre et contenu requis',
      });
    }

    const now = new Date().toISOString();
    const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const post: CommunityPost = {
      id,
      authorId: user.id,
      title: input.title.trim(),
      body: this.normalizeBody(input.body),
      tags: this.normalizeTags(input.tags),
      status: this.needsModeration(input.body) ? 'under_review' : 'published',
      createdAt: now,
      updatedAt: now,
    };

    this.posts.set(id, post);
    this.replies.set(id, []);

    return { post };
  }

  async listPosts(
    user: { id: string; roles: string[] },
    query: { tag?: string; cursor?: string },
  ) {
    await Promise.resolve();
    this.assertCommunityUser(user);

    const all = [...this.posts.values()]
      .filter((post) => post.status !== 'removed')
      .filter((post) => (query.tag ? post.tags.includes(query.tag) : true))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const startIndex = query.cursor
      ? Math.max(all.findIndex((item) => item.id === query.cursor) + 1, 0)
      : 0;

    const pageSize = 20;
    const page = all.slice(startIndex, startIndex + pageSize);

    const posts = page.map((post) => ({
      ...post,
      repliesCount: this.replies.get(post.id)?.length ?? 0,
    }));

    return {
      posts,
      metadata: {
        nextCursor: page.length === pageSize ? page[page.length - 1].id : null,
        hasMore: startIndex + page.length < all.length,
      },
    };
  }

  async getPostById(user: { id: string; roles: string[] }, postId: string) {
    await Promise.resolve();
    this.assertCommunityUser(user);

    const post = this.posts.get(postId);
    if (!post || post.status === 'removed') {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post introuvable',
      });
    }

    return {
      post,
      replies: this.replies.get(postId) ?? [],
    };
  }

  async createReply(
    user: { id: string; roles: string[] },
    postId: string,
    input: { body: string },
  ) {
    this.assertCommunityUser(user);
    await this.assertConsent(user.id);

    const post = this.posts.get(postId);
    if (!post || post.status === 'removed') {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post introuvable',
      });
    }

    if (!input.body?.trim()) {
      throw new BadRequestException({
        code: 'REPLY_INVALID',
        message: 'Le contenu de la reponse est requis',
      });
    }

    const reply: CommunityReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId,
      authorId: user.id,
      body: this.normalizeBody(input.body),
      createdAt: new Date().toISOString(),
    };

    const current = this.replies.get(postId) ?? [];
    current.push(reply);
    this.replies.set(postId, current);

    return { reply };
  }

  async updatePost(
    user: { id: string; roles: string[] },
    postId: string,
    input: { title?: string; body?: string; tags?: string[] },
  ) {
    await Promise.resolve();
    const post = this.posts.get(postId);

    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post introuvable',
      });
    }

    if (post.authorId !== user.id && !user.roles.includes('admin')) {
      throw new ForbiddenException({
        code: 'POST_UPDATE_FORBIDDEN',
        message: 'Vous ne pouvez pas modifier ce post',
      });
    }

    const updated: CommunityPost = {
      ...post,
      title: input.title?.trim() || post.title,
      body: input.body ? this.normalizeBody(input.body) : post.body,
      tags: input.tags ? this.normalizeTags(input.tags) : post.tags,
      updatedAt: new Date().toISOString(),
    };

    this.posts.set(postId, updated);

    return { post: updated };
  }

  async setPostStatus(postId: string, status: CommunityPostStatus) {
    await Promise.resolve();
    const post = this.posts.get(postId);
    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post introuvable',
      });
    }

    const updated = {
      ...post,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.posts.set(postId, updated);

    return { post: updated };
  }

  private assertCommunityUser(user: { roles: string[] }) {
    const allowed =
      user.roles.includes('etudiant') ||
      user.roles.includes('mentor') ||
      user.roles.includes('admin');
    if (!allowed) {
      throw new ForbiddenException({
        code: 'COMMUNITY_FORBIDDEN',
        message: 'Role non autorise pour la communaute',
      });
    }
  }

  private async assertConsent(userId: string) {
    const latestConsent = await this.prisma.consents.findFirst({
      where: { user_id: userId },
      orderBy: { consented_at: 'desc' },
    });

    if (!latestConsent || latestConsent.withdrawn_at) {
      throw new ForbiddenException({
        code: 'CONSENT_REQUIRED',
        message: 'Consentement requis pour publier',
      });
    }
  }

  private normalizeTags(tags?: string[]) {
    return [
      ...new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ].slice(0, 5);
  }

  private normalizeBody(body: string) {
    return body.trim().slice(0, 5000);
  }

  private needsModeration(body: string) {
    const flaggedWords = ['spam', 'arnaque', 'violence'];
    return flaggedWords.some((word) => body.toLowerCase().includes(word));
  }
}
