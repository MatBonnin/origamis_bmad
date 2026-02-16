import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingModule } from '../matching';

@Module({
  imports: [MatchingModule],
  controllers: [MentorsController],
})
export class MentorsModule {}
