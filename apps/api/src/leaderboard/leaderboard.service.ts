import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User, Battle } from '../entities/entities';

export interface LeaderboardRow {
  id: string;
  username: string;
  rating: number;
  level: number;
  wins: number;
  losses: number;
  winRate: number | null;
  rank: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Battle) private readonly battlesRepo: Repository<Battle>,
  ) {}

  async getTop100(): Promise<LeaderboardRow[]> {
    const users = await this.usersRepo.find({ order: { rating: 'DESC' }, take: 100 });
    const battles = await this.battlesRepo.find({ where: { completedAt: Not(IsNull()) } });

    const stats = new Map<string, { wins: number; losses: number }>();
    for (const b of battles) {
      if (!b.result) continue;
      const s = stats.get(b.userId) ?? { wins: 0, losses: 0 };
      if (b.result === 'win') s.wins += 1;
      else if (b.result === 'loss') s.losses += 1;
      stats.set(b.userId, s);
    }

    return users.map((u, index) => {
      const s = stats.get(u.id) ?? { wins: 0, losses: 0 };
      const total = s.wins + s.losses;
      return {
        id: u.id,
        username: u.username,
        rating: u.rating,
        level: u.level,
        wins: s.wins,
        losses: s.losses,
        winRate: total > 0 ? Math.round((100 * s.wins) / total) : null,
        rank: index + 1,
      };
    });
  }

  async getMyRank(userId: string): Promise<number | null> {
    const users = await this.usersRepo.find({ order: { rating: 'DESC' } });
    const index = users.findIndex((u) => u.id === userId);
    return index === -1 ? null : index + 1;
  }
}
