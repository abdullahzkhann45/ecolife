import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './friendship.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { User } from '../users/user.entity';
import { PointsLedger } from '../points/points-ledger.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, User, PointsLedger])],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
