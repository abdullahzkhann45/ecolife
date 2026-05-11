import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('pending')
  getPending(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get('leaderboard')
  getLeaderboard(@Request() req) {
    return this.friendsService.getWeeklyLeaderboard(req.user.id);
  }

  @Post('request')
  sendRequest(@Request() req, @Body() body: { username: string }) {
    return this.friendsService.sendRequest(req.user.id, body.username);
  }

  @Post(':id/accept')
  accept(@Request() req, @Param('id') id: string) {
    return this.friendsService.acceptRequest(req.user.id, id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.friendsService.removeFriend(req.user.id, id);
  }

  @Post('block')
  block(@Request() req, @Body() body: { username: string }) {
    return this.friendsService.blockUser(req.user.id, body.username);
  }
}
