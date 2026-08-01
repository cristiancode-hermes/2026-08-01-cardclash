import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';

@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const [rows, myRank] = await Promise.all([
      this.leaderboardService.getTop100(),
      this.leaderboardService.getMyRank(user.id),
    ]);
    return { rows, myRank };
  }
}
