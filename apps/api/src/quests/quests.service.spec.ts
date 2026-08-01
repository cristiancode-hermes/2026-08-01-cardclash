import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { QuestsService } from './quests.service';
import { DataSource } from 'typeorm';
import { Quest, UserQuest, User } from '../entities/entities';

describe('QuestsService', () => {
  let service: QuestsService;

  const questsRepo = { find: jest.fn(), findOne: jest.fn() };
  const userQuestsRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((d) => d),
    save: jest.fn((e) => Promise.resolve(e)),
  };
  const usersRepo = { findOne: jest.fn() };

  const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
    id: 'q1',
    type: 'win_battles',
    title: 'Win 3 battles',
    description: 'Beat the AI three times.',
    target: 3,
    rewardGold: 60,
    rewardXp: 40,
    isDaily: true,
    createdAt: new Date(),
    ...overrides,
  } as Quest);

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: getRepositoryToken(Quest), useValue: questsRepo },
        { provide: getRepositoryToken(UserQuest), useValue: userQuestsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(QuestsService);
  });

  describe('getDaily', () => {
    it('returns quest views with zero progress when no user quests exist', async () => {
      questsRepo.find.mockResolvedValue([makeQuest()]);
      userQuestsRepo.find.mockResolvedValue([]);
      const views = await service.getDaily('u1');
      expect(views[0].questId).toBe('q1');
      expect(views[0].progress).toBe(0);
      expect(views[0].isCompleted).toBe(false);
      expect(views[0].rewardGold).toBe(60);
    });

    it('returns stored progress for existing user quests', async () => {
      questsRepo.find.mockResolvedValue([makeQuest()]);
      userQuestsRepo.find.mockResolvedValue([
        { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 2, isCompleted: false, claimedAt: null },
      ]);
      const views = await service.getDaily('u1');
      expect(views[0].progress).toBe(2);
    });
  });

  describe('progress', () => {
    it('creates a user quest row on first progress and increments', async () => {
      questsRepo.find.mockResolvedValue([makeQuest()]);
      userQuestsRepo.findOne.mockResolvedValue(null);
      const saved = { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 0, isCompleted: false, claimedAt: null };
      userQuestsRepo.save.mockResolvedValue(saved);
      await service.progress('u1', 'win_battles', 1);
      expect(userQuestsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ questId: 'q1', progress: 0 }));
      expect(userQuestsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ progress: 1 }));
    });

    it('caps progress at the quest target', async () => {
      questsRepo.find.mockResolvedValue([makeQuest()]);
      const uq = { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 2, isCompleted: false, claimedAt: null };
      userQuestsRepo.findOne.mockResolvedValue(uq);
      await service.progress('u1', 'win_battles', 5);
      expect(uq.progress).toBe(3);
      expect(uq.isCompleted).toBe(true);
    });

    it('skips already completed quests', async () => {
      questsRepo.find.mockResolvedValue([makeQuest()]);
      const uq = { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 3, isCompleted: true, claimedAt: null };
      userQuestsRepo.findOne.mockResolvedValue(uq);
      await service.progress('u1', 'win_battles', 1);
      expect(uq.progress).toBe(3);
      expect(userQuestsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('claim', () => {
    it('rejects claiming a quest that is not completed', async () => {
      const dataSource = { transaction: jest.fn((cb) => cb(managerMock({ isCompleted: false }))) };
      (service as any).dataSource = dataSource;
      questsRepo.findOne.mockResolvedValue(makeQuest());
      await expect(service.claim('u1', 'q1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects claiming an already claimed quest', async () => {
      const dataSource = { transaction: jest.fn((cb) => cb(managerMock({ isCompleted: true, claimedAt: new Date() }))) };
      (service as any).dataSource = dataSource;
      questsRepo.findOne.mockResolvedValue(makeQuest());
      await expect(service.claim('u1', 'q1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('awards gold and xp on a valid claim', async () => {
      const uq = { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 3, isCompleted: true, claimedAt: null };
      const user = { id: 'u1', gold: 100, xp: 50, level: 1 };
      const dataSource = {
        transaction: jest.fn((cb) =>
          cb({
            findOne: jest.fn(async (Entity, opts) => {
              if (Entity === UserQuest) return uq;
              if (Entity === User) return user;
              return null;
            }),
            save: jest.fn(async () => undefined),
          }),
        ),
      };
      (service as any).dataSource = dataSource;
      questsRepo.findOne.mockResolvedValue(makeQuest());
      const result = await service.claim('u1', 'q1');
      expect(result.rewards).toEqual({ gold: 60, xp: 40 });
      expect(user.gold).toBe(160);
      expect(user.xp).toBe(90);
      expect(user.level).toBe(Math.floor(90 / 100) + 1);
    });
  });
});

function managerMock(uqOverrides: Partial<UserQuest>) {
  return {
    findOne: jest.fn(async (Entity) => {
      if (Entity === UserQuest) return { id: 'uq1', userId: 'u1', questId: 'q1', questDate: '2026-08-01', progress: 3, ...uqOverrides };
      if (Entity === User) return { id: 'u1', gold: 100, xp: 50, level: 1 };
      return null;
    }),
    save: jest.fn(async () => undefined),
  };
}
