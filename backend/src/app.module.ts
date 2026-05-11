import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TasksModule } from './tasks/tasks.module';
import { EcoScoreModule } from './eco-score/eco-score.module';
import { StreaksModule } from './streaks/streaks.module';
import { PointsModule } from './points/points.module';
import { FriendsModule } from './friends/friends.module';
import { ShopModule } from './shop/shop.module';

const DB_PATH = 'ecolife.db';

function loadDatabase(): Uint8Array | undefined {
  if (existsSync(DB_PATH)) {
    return new Uint8Array(readFileSync(DB_PATH));
  }
  return undefined;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      database: loadDatabase(),
      location: DB_PATH,
      autoSave: true,
      autoSaveCallback: (db: Uint8Array) => {
        writeFileSync(DB_PATH, Buffer.from(db));
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    } as any),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    OnboardingModule,
    TasksModule,
    EcoScoreModule,
    StreaksModule,
    PointsModule,
    FriendsModule,
    ShopModule,
  ],
})
export class AppModule {}
