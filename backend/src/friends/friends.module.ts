import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Friendship, FriendshipSchema } from './friendship.schema';
import { User, UserSchema } from '../users/user.schema';
import { PointsLedger, PointsLedgerSchema } from '../points/points-ledger.schema';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Friendship.name, schema: FriendshipSchema },
    { name: User.name, schema: UserSchema },
    { name: PointsLedger.name, schema: PointsLedgerSchema },
  ])],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
