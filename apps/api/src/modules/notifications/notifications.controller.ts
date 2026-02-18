import {
  Controller,
  Get,
  Param,
  Patch,
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
import { UserResponseDto } from '../auth/dto';
import { NotificationsService } from './notifications.service';
import { NotificationCategory } from '../users/dto/notification-preferences.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les notifications de l utilisateur' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['messages', 'rdv', 'system'],
  })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Notifications recuperees' })
  async getNotifications(
    @CurrentUser() user: UserResponseDto,
    @Query('category') category?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const data = await this.notificationsService.listNotifications(user.id, {
      category: category as NotificationCategory | undefined,
      unreadOnly: unreadOnly === 'true',
    });
    return { data, error: null };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiResponse({ status: 200, description: 'Compteur recupere' })
  async getUnreadCount(@CurrentUser() user: UserResponseDto) {
    const data = await this.notificationsService.getUnreadCount(user.id);
    return { data, error: null };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 200, description: 'Notification marquee comme lue' })
  async markAsRead(
    @CurrentUser() user: UserResponseDto,
    @Param('id') notificationId: string,
  ) {
    const data = await this.notificationsService.markAsRead(
      user.id,
      notificationId,
    );
    return { data, error: null };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({
    status: 200,
    description: 'Notifications marquees comme lues',
  })
  async markAllAsRead(@CurrentUser() user: UserResponseDto) {
    const data = await this.notificationsService.markAllAsRead(user.id);
    return { data, error: null };
  }
}
