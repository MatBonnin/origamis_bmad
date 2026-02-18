import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingModule } from '../matching';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications';
import { MentorsAvailabilityService } from './mentors-availability.service';
import { MentorsAdminService } from './mentors-admin.service';
import { MentorsProfileService } from './mentors-profile.service';
import { MentorsSearchService } from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';
import { MentorsEpic8Service } from './mentors-epic8.service';
import { MentorsWorkflowController } from './mentors-workflow.controller';

@Module({
  imports: [MatchingModule, PrismaModule, NotificationsModule],
  controllers: [MentorsController, MentorsWorkflowController],
  providers: [
    MentorsSearchService,
    MentorsProfileService,
    MentorsSelfService,
    MentorsAvailabilityService,
    MentorsAdminService,
    MentorsEpic8Service,
  ],
})
export class MentorsModule {}
