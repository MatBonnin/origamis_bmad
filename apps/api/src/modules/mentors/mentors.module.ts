import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingModule } from '../matching';
import { PrismaModule } from '../prisma';
import { MentorsAvailabilityService } from './mentors-availability.service';
import { MentorsProfileService } from './mentors-profile.service';
import { MentorsSearchService } from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';

@Module({
  imports: [MatchingModule, PrismaModule],
  controllers: [MentorsController],
  providers: [MentorsSearchService, MentorsProfileService, MentorsSelfService, MentorsAvailabilityService],
})
export class MentorsModule {}
