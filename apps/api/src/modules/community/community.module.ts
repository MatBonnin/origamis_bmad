import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { CommunityController } from './community.controller';
import { CommunityGateway } from './community.gateway';
import { CommunityService } from './community.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityService],
})
export class CommunityModule {}
