import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingModule } from '../matching';
import { PrismaModule } from '../prisma';
import { MentorsSearchService } from './mentors-search.service';

@Module({
  imports: [MatchingModule, PrismaModule],
  controllers: [MentorsController],
  providers: [MentorsSearchService],
})
export class MentorsModule {}
