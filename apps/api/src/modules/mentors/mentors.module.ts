import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingModule } from '../matching';
import { PrismaModule } from '../prisma';
import { MentorsProfileService } from './mentors-profile.service';
import { MentorsSearchService } from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';

@Module({
  imports: [MatchingModule, PrismaModule],
  controllers: [MentorsController],
  providers: [MentorsSearchService, MentorsProfileService, MentorsSelfService],
})
export class MentorsModule {}
