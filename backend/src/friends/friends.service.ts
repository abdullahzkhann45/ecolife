import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from './friendship.entity';
import { User } from '../users/user.entity';
import { PointsLedger } from '../points/points-ledger.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(PointsLedger)
    private ledgerRepo: Repository<PointsLedger>,
  ) {}

  async sendRequest(requesterId: string, username: string) {
    const addressee = await this.userRepo.findOne({ where: { username } });
    if (!addressee) throw new NotFoundException('User not found');
    if (addressee.id === requesterId) throw new BadRequestException('Cannot friend yourself');

    const existing = await this.friendshipRepo.findOne({
      where: [
        { requesterId, addresseeId: addressee.id },
        { requesterId: addressee.id, addresseeId: requesterId },
      ],
    });
    if (existing) throw new BadRequestException('Friendship already exists');

    return this.friendshipRepo.save(this.friendshipRepo.create({ requesterId, addresseeId: addressee.id }));
  }

  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId, addresseeId: userId, status: FriendshipStatus.PENDING },
    });
    if (!friendship) throw new NotFoundException('Friend request not found');
    friendship.status = FriendshipStatus.ACCEPTED;
    return this.friendshipRepo.save(friendship);
  }

  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        { id: friendshipId, requesterId: userId },
        { id: friendshipId, addresseeId: userId },
      ],
    });
    if (!friendship) throw new NotFoundException('Friendship not found');
    return this.friendshipRepo.remove(friendship);
  }

  async blockUser(userId: string, targetUsername: string) {
    const target = await this.userRepo.findOne({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');
    let friendship = await this.friendshipRepo.findOne({
      where: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    });
    if (friendship) {
      friendship.status = FriendshipStatus.BLOCKED;
    } else {
      friendship = this.friendshipRepo.create({ requesterId: userId, addresseeId: target.id, status: FriendshipStatus.BLOCKED });
    }
    return this.friendshipRepo.save(friendship);
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipRepo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });
    return friendships.map(f => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      const { passwordHash, ...safe } = friend;
      return { friendshipId: f.id, ...safe };
    });
  }

  async getPendingRequests(userId: string) {
    return this.friendshipRepo.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });
  }

  async getWeeklyLeaderboard(userId: string) {
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f.id);
    friendIds.push(userId);

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const entries = await this.ledgerRepo.find();
    const weeklyPoints: Record<string, number> = {};

    for (const id of friendIds) {
      weeklyPoints[id] = entries
        .filter(e => e.userId === id && e.amount > 0 && e.createdAt > weekAgo)
        .reduce((sum, e) => sum + e.amount, 0);
    }

    const users = await this.userRepo.findByIds(friendIds);
    const leaderboard = users.map(u => ({
      id: u.id,
      username: u.username,
      weeklyPoints: weeklyPoints[u.id] || 0,
      isCurrentUser: u.id === userId,
    })).sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    return leaderboard.map((u, i) => ({ ...u, rank: i + 1 }));
  }
}
