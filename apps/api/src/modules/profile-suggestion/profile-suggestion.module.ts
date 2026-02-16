import { Module } from '@nestjs/common';
import { ProfileSuggestionController } from './profile-suggestion.controller';
import { ProfileSuggestionService } from './profile-suggestion.service';

@Module({
  controllers: [ProfileSuggestionController],
  providers: [ProfileSuggestionService],
  exports: [ProfileSuggestionService],
})
export class ProfileSuggestionModule {}
