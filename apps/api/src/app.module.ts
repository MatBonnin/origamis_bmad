import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma';
import { AuthModule } from './modules/auth';
import { MailModule } from './modules/mail';
import { UsersModule } from './modules/users';
import { AdminModule } from './modules/admin';
import { NotificationsModule } from './modules/notifications';
import { OnboardingModule } from './modules/onboarding';
import { ProfileSuggestionModule } from './modules/profile-suggestion';
import { MentorsModule } from './modules/mentors';
import { MatchingModule } from './modules/matching';
import { MessagingModule } from './modules/messaging';
import { BookingsModule } from './modules/bookings';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AdminModule,
    NotificationsModule,
    OnboardingModule,
    ProfileSuggestionModule,
    MatchingModule,
    MentorsModule,
    MessagingModule,
    BookingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
