import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TasksModule } from './tasks/tasks.module';
import { EcoScoreModule } from './eco-score/eco-score.module';
import { StreaksModule } from './streaks/streaks.module';
import { PointsModule } from './points/points.module';
import { FriendsModule } from './friends/friends.module';
import { ActivityModule } from './activity/activity.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        const logger = new Logger('MongooseModule');
        if (!uri) {
          logger.error('MONGODB_URI is not set in environment variables!');
          throw new Error('MONGODB_URI environment variable is required');
        }
        logger.log('Connecting to MongoDB Atlas...');
        return {
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => logger.log('Connected to MongoDB Atlas'));
            connection.on('error', (err) => logger.error('MongoDB connection error:', err.message));
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    OnboardingModule,
    TasksModule,
    EcoScoreModule,
    StreaksModule,
    PointsModule,
    FriendsModule,
    ActivityModule,
    AdminModule,
  ],
})
export class AppModule {}
