import { Test, TestingModule } from '@nestjs/testing';
import { CommunityController } from './community.controller';
import { CommunityGateway } from './community.gateway';
import { CommunityService } from './community.service';

describe('CommunityController', () => {
  let controller: CommunityController;

  const mockService = {
    createPost: jest.fn(),
    listPosts: jest.fn(),
    getPostById: jest.fn(),
    createReply: jest.fn(),
    updatePost: jest.fn(),
  };

  const mockGateway = {
    emitPostCreated: jest.fn(),
    emitReplyCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunityController],
      providers: [
        { provide: CommunityService, useValue: mockService },
        { provide: CommunityGateway, useValue: mockGateway },
      ],
    }).compile();

    controller = module.get<CommunityController>(CommunityController);
    jest.clearAllMocks();
  });

  it('wraps post creation response', async () => {
    mockService.createPost.mockResolvedValue({ post: { id: 'post-1' } });

    const result = await controller.createPost(
      { id: 'student-1', roles: ['etudiant'] },
      { title: 'Test', body: 'Body' },
    );

    expect(result).toEqual({ data: { post: { id: 'post-1' } }, error: null });
    expect(mockGateway.emitPostCreated).toHaveBeenCalled();
  });
});
