import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quest, UserQuest, User } from '../entities/entities';

export interface UserQuestView {
  id: string;
  questId: string;
  type: string;
  title: string;
  description: string | null;
  target: number;
  progress: number;
  isCompleted: boolean;
  claimedAt: Date | null;
  rewardGold: number;
  rewardXp: number;
  isDaily: boolean;
}

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest) private readonly questsRepo: Repository<Quest>,
    @InjectRepository(UserQuest) private readonly userQuestsRepo: Repository<UserQuest>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async getDaily(userId: string): Promise<UserQuestView[]> {
    const today = this.today();
    const quests = await this.questsRepo.find({ order: { isDaily: 'DESC' } });
    const userQuests = await this.userQuestsRepo.find({ where: { userId, questDate: today } });
    const byQuest = new Map(userQuests.map((q) => [q.questId, q]));

    return quests.map((quest) => {
      const uq = byQuest.get(quest.id);
      return {
        id: uq?.id ?? '',
        questId: quest.id,
        type: quest.type,
        title: quest.title,
        description: quest.description,
        target: quest.target,
        progress: uq?.progress ?? 0,
        isCompleted: uq?.isCompleted ?? false,
        claimedAt: uq?.claimedAt ?? null,
        rewardGold: quest.rewardGold,
        rewardXp: quest.rewardXp,
        isDaily: quest.isDaily,
      };
    });
  }

  async progress(userId: string, type: string, amount = 1) {
    const today = this.today();
    const quests = await this.questsRepo.find({ where: { type } });
    for (const quest of quests) {
      let uq = await this.userQuestsRepo.findOne({ where: { userId, questId: quest.id, questDate: today } });
      if (!uq) {
        uq = await this.userQuestsRepo.save(
          this.userQuestsRepo.create({ userId, questId: quest.id, questDate: today, progress: 0 } as any),
        ) as unknown as UserQuest;
      }
      if (uq.isCompleted || uq.claimedAt) continue;
      uq.progress = Math.min(quest.target, uq.progress + amount);
      uq.isCompleted = uq.progress >= quest.target;
      await this.userQuestsRepo.save(uq);
    }
  }

  async claim(userId: string, questId: string) {
    const today = this.today();
    const quest = await this.questsRepo.findOne({ where: { id: questId } });
    if (!quest) throw new BadRequestException('Quest not found');

    return this.dataSource.transaction(async (manager) => {
      const uq = await manager.findOne(UserQuest, { where: { userId, questId, questDate: today } });
      if (!uq) throw new BadRequestException('Quest not started');
      if (!uq.isCompleted) throw new BadRequestException('Quest not completed yet');
      if (uq.claimedAt) throw new BadRequestException('Quest already claimed');

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      user.gold = (user.gold ?? 0) + quest.rewardGold;
      user.xp = (user.xp ?? 0) + quest.rewardXp;
      user.level = Math.floor(user.xp / 100) + 1;
      uq.claimedAt = new Date();

      await manager.save(User, user);
      await manager.save(UserQuest, uq);

      return {
        rewards: { gold: quest.rewardGold, xp: quest.rewardXp },
        user,
      };
    });
  }
}
