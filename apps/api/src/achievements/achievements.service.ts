import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Achievement, UserAchievement, User } from '../entities/entities';

export interface AchievementView {
  id: string;
  type: string;
  name: string;
  description: string | null;
  target: number;
  rewardGold: number;
  rewardXp: number;
  unlocked: boolean;
  claimedAt: Date | null;
  progress: number;
}

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement) private readonly achievementsRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement) private readonly userAchievementsRepo: Repository<UserAchievement>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: string): Promise<AchievementView[]> {
    const achievements = await this.achievementsRepo.find({ order: { target: 'ASC' } });
    const userAchievements = await this.userAchievementsRepo.find({ where: { userId } });
    const byAchievement = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    const wins = user ? await this.countWins(userId) : 0;
    const packs = user ? await this.countPacks(userId) : 0;
    const decks = user ? await this.countDecks(userId) : 0;

    return achievements.map((a) => {
      const ua = byAchievement.get(a.id);
      let progress = 0;
      switch (a.type) {
        case 'first_win':
        case 'wins_total':
          progress = wins;
          break;
        case 'packs_opened':
          progress = packs;
          break;
        case 'deck_created':
          progress = decks;
          break;
        case 'level_reached':
          progress = user?.level ?? 0;
          break;
        case 'beat_master':
          progress = wins;
          break;
        default:
          progress = 0;
      }
      return {
        id: a.id,
        type: a.type,
        name: a.name,
        description: a.description,
        target: a.target,
        rewardGold: a.rewardGold,
        rewardXp: a.rewardXp,
        unlocked: !!ua,
        claimedAt: ua?.claimedAt ?? null,
        progress: Math.min(progress, a.target),
      };
    });
  }

  async checkUnlocks(userId: string, ctx?: { win?: boolean; masterWin?: boolean; packOpened?: boolean; deckCreated?: boolean; level?: number }) {
    const achievements = await this.achievementsRepo.find();
    const userAchievements = await this.userAchievementsRepo.find({ where: { userId } });
    const unlockedTypes = new Set(userAchievements.map((ua) => ua.achievementId));

    const wins = await this.countWins(userId);
    const packs = await this.countPacks(userId);
    const decks = await this.countDecks(userId);
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    for (const a of achievements) {
      if (unlockedTypes.has(a.id)) continue;
      let shouldUnlock = false;
      switch (a.type) {
        case 'first_win':
          shouldUnlock = (ctx?.win ?? false) || wins >= a.target;
          break;
        case 'wins_total':
          shouldUnlock = wins >= a.target;
          break;
        case 'packs_opened':
          shouldUnlock = (ctx?.packOpened ?? false) || packs >= a.target;
          break;
        case 'deck_created':
          shouldUnlock = (ctx?.deckCreated ?? false) || decks >= a.target;
          break;
        case 'level_reached':
          shouldUnlock = (user?.level ?? 0) >= a.target;
          break;
        case 'beat_master':
          shouldUnlock = ctx?.masterWin ?? false;
          break;
      }
      if (shouldUnlock) {
        await this.userAchievementsRepo.save(
          this.userAchievementsRepo.create({ userId, achievementId: a.id } as any),
        );
      }
    }
  }

  async claim(userId: string, achievementId: string) {
    const achievement = await this.achievementsRepo.findOne({ where: { id: achievementId } });
    if (!achievement) throw new BadRequestException('Achievement not found');

    return this.dataSource.transaction(async (manager) => {
      const ua = await manager.findOne(UserAchievement, { where: { userId, achievementId } });
      if (!ua) throw new BadRequestException('Achievement not unlocked yet');
      if (ua.claimedAt) throw new BadRequestException('Achievement already claimed');

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      user.gold = (user.gold ?? 0) + achievement.rewardGold;
      user.xp = (user.xp ?? 0) + achievement.rewardXp;
      user.level = Math.floor(user.xp / 100) + 1;
      ua.claimedAt = new Date();

      await manager.save(User, user);
      await manager.save(UserAchievement, ua);

      return {
        rewards: { gold: achievement.rewardGold, xp: achievement.rewardXp },
        user,
      };
    });
  }

  private async countWins(userId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM battles WHERE "userId" = ? AND result = 'win'`,
      [userId],
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  private async countPacks(userId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM pack_openings WHERE "userId" = ?`,
      [userId],
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  private async countDecks(userId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM decks WHERE "userId" = ?`,
      [userId],
    );
    return Number(rows?.[0]?.count ?? 0);
  }
}
