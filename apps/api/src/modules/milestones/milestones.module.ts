import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications';
import { PrismaModule } from '../prisma';
import { MilestonesLegacyController } from './milestones-legacy.controller';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [MilestonesController, MilestonesLegacyController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
