import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CommunityGateway } from './community.gateway';
import { CommunityService } from './community.service';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly communityGateway: CommunityGateway,
  ) {}

  @Post('posts')
  @ApiOperation({ summary: 'Publier un post communautaire' })
  @ApiResponse({ status: 201, description: 'Post cree' })
  async createPost(
    @CurrentUser() user: { id: string; roles: string[] },
    @Body() body: { title: string; body: string; tags?: string[] },
  ) {
    const data = await this.communityService.createPost(user, body);
    this.communityGateway.emitPostCreated(data.post);
    return { data, error: null };
  }

  @Get('posts')
  @ApiOperation({ summary: 'Lister les posts communautaires' })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getPosts(
    @CurrentUser() user: { id: string; roles: string[] },
    @Query('tag') tag?: string,
    @Query('cursor') cursor?: string,
  ) {
    const data = await this.communityService.listPosts(user, { tag, cursor });
    return { data, error: null };
  }

  @Get('posts/:id')
  async getPost(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') postId: string,
  ) {
    const data = await this.communityService.getPostById(user, postId);
    return { data, error: null };
  }

  @Post('posts/:id/replies')
  @ApiOperation({ summary: 'Repondre a un post' })
  async createReply(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') postId: string,
    @Body() body: { body: string },
  ) {
    const data = await this.communityService.createReply(user, postId, body);
    this.communityGateway.emitReplyCreated(data.reply);
    return { data, error: null };
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Editer un post' })
  async updatePost(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') postId: string,
    @Body() body: { title?: string; body?: string; tags?: string[] },
  ) {
    const data = await this.communityService.updatePost(user, postId, body);
    return { data, error: null };
  }
}
