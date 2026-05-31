import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Friendship, FriendshipDocument, FriendshipStatus } from './friendship.schema';
import { User, UserDocument } from '../users/user.schema';
import { PointsLedger, PointsLedgerDocument } from '../points/points-ledger.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PointsLedger.name) private ledgerModel: Model<PointsLedgerDocument>,
  ) {}

  async sendRequest(requesterId: string, username: string) {
    const addressee = await this.userModel.findOne({ username });
    if (!addressee) throw new NotFoundException('User not found');
    const addresseeId = addressee._id.toString();
    if (addresseeId === requesterId) throw new BadRequestException('Cannot friend yourself');

    const existing = await this.friendshipModel.findOne({
      $or: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    });
    if (existing) throw new BadRequestException('Friendship already exists');

    return this.friendshipModel.create({ requesterId, addresseeId });
  }

  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipModel.findOne({
      _id: friendshipId, addresseeId: userId, status: FriendshipStatus.PENDING,
    });
    if (!friendship) throw new NotFoundException('Friend request not found');
    friendship.status = FriendshipStatus.ACCEPTED;
    return friendship.save();
  }

  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.friendshipModel.findOne({
      _id: friendshipId,
      $or: [{ requesterId: userId }, { addresseeId: userId }],
    });
    if (!friendship) throw new NotFoundException('Friendship not found');
    return this.friendshipModel.deleteOne({ _id: friendshipId });
  }

  async blockUser(userId: string, targetUsername: string) {
    const target = await this.userModel.findOne({ username: targetUsername });
    if (!target) throw new NotFoundException('User not found');
    const targetId = target._id.toString();
    let friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: userId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: userId },
      ],
    });
    if (friendship) {
      friendship.status = FriendshipStatus.BLOCKED;
      return friendship.save();
    } else {
      return this.friendshipModel.create({ requesterId: userId, addresseeId: targetId, status: FriendshipStatus.BLOCKED });
    }
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipModel.find({
      $or: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    // Collect all friend user IDs
    const friendUserIds = friendships.map(f =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
    const users = await this.userModel.find({ _id: { $in: friendUserIds } });
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    return friendships.map(f => {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const friend = userMap.get(friendId);
      return {
        friendshipId: f._id.toString(),
        id: friendId,
        username: friend?.username,
        email: friend?.email,
        avatarItem: friend?.avatarItem,
      };
    }).filter(f => f.username); // filter out any missing users
  }

  async getPendingRequests(userId: string) {
    const pending = await this.friendshipModel.find({
      addresseeId: userId, status: FriendshipStatus.PENDING,
    });
    const requesterIds = pending.map(p => p.requesterId);
    const users = await this.userModel.find({ _id: { $in: requesterIds } });
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    return pending.map(p => ({
      _id: p._id.toString(),
      requesterId: p.requesterId,
      requester: userMap.get(p.requesterId),
      status: p.status,
    }));
  }

  async getWeeklyLeaderboard(userId: string) {
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f.id);
    friendIds.push(userId);

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const entries = await this.ledgerModel.find({
      userId: { $in: friendIds },
      amount: { $gt: 0 },
      createdAt: { $gte: weekAgo },
    });

    const weeklyPoints: Record<string, number> = {};
    for (const id of friendIds) weeklyPoints[id] = 0;
    for (const e of entries) {
      const uid = e.userId.toString();
      weeklyPoints[uid] = (weeklyPoints[uid] || 0) + e.amount;
    }

    const users = await this.userModel.find({ _id: { $in: friendIds } });
    const leaderboard = users.map(u => ({
      id: u._id.toString(),
      username: u.username,
      weeklyPoints: weeklyPoints[u._id.toString()] || 0,
      isCurrentUser: u._id.toString() === userId,
    })).sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    return leaderboard.map((u, i) => ({ ...u, rank: i + 1 }));
  }
}
