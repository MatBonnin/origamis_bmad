import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { UserResponseDto } from '../auth/dto';
import { GetConversationMessagesQueryDto, SendMessageDto } from './dto';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Lister les conversations de l utilisateur connecte',
  })
  @ApiResponse({ status: 200, description: 'Conversations recuperees' })
  async getConversations(@CurrentUser() user: UserResponseDto) {
    const data = await this.messagingService.listConversations(user.id);
    return { data, error: null };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Lister les messages d une conversation (pagination cursor)',
  })
  @ApiResponse({ status: 200, description: 'Messages recuperes' })
  async getConversationMessages(
    @CurrentUser() user: UserResponseDto,
    @Param('id') conversationId: string,
    @Query() query: GetConversationMessagesQueryDto,
  ) {
    const data = await this.messagingService.getConversationMessages(
      user.id,
      conversationId,
      {
        cursor: query.cursor,
        limit: query.limit,
      },
    );

    return { data, error: null };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Envoyer un message a un mentor ou un etudiant' })
  @ApiResponse({ status: 201, description: 'Message envoye' })
  async sendMessage(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.messagingService.sendMessage(user.id, dto);
    return { data, error: null };
  }
}
