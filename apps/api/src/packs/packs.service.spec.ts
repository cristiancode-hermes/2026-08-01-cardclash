import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { PacksService } from './packs.service';
import { DataSource } from 'typeorm';
import { Pack, User, UserCard, Card, PackOpening } from '../entities/entities';

describe('PacksService', () => {
  let service: PacksService;

  const mockRepos = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((d) => d),
    save: jest.fn((e) => Promise.resolve(e)),
  });

  const dataSource = {
    transaction: jest.fn((cb) => cb({ getRepository: () => mockRepos(), save: jest.fn() })),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PacksService,
        { provide: getRepositoryToken(Pack), useValue: mockRepos() },
        { provide: getRepositoryToken(User), useValue: mockRepos() },
        { provide: getRepositoryToken(UserCard), useValue: mockRepos() },
        { provide: getRepositoryToken(Card), useValue: mockRepos() },
        { provide: getRepositoryToken(PackOpening), useValue: mockRepos() },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(PacksService);
  });

  describe('rollRarity', () => {
    const rates = { common: 0.7, rare: 0.2, epic: 0.08, legendary: 0.02 };

    it('returns common for low rolls', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      expect(service.rollRarity(rates)).toBe('common');
    });

    it('returns rare for mid rolls', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.75);
      expect(service.rollRarity(rates)).toBe('rare');
    });

    it('returns epic for high-mid rolls', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.92);
      expect(service.rollRarity(rates)).toBe('epic');
    });

    it('returns legendary for top rolls', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(service.rollRarity(rates)).toBe('legendary');
    });

    it('falls back to common when the roll exceeds the sum of weights', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9999);
      expect(service.rollRarity({ common: 0.5 })).toBe('common');
    });
  });

  describe('findPacks', () => {
    it('returns only active packs ordered by price', async () => {
      const repo = service['packsRepo'] as any;
      repo.find.mockResolvedValue([{ id: 'p1' }]);
      await service.findPacks();
      expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true }, order: { price: 'ASC' } });
    });
  });

  describe('openPack', () => {
    it('throws NotFoundException for a missing pack', async () => {
      (service['packsRepo'] as any).findOne.mockResolvedValue(null);
      await expect(service.openPack('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the user lacks gold', async () => {
      (service['packsRepo'] as any).findOne.mockResolvedValue({ id: 'p1', price: 100, cardCount: 5, dropRates: { common: 1 }, guaranteedRarity: null });
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          getRepository: () => ({
            createQueryBuilder: () => ({
              where: () => ({ getOne: async () => ({ id: 'u1', gold: 10 }) }),
            }),
          }),
        };
        return cb(manager);
      });
      await expect(service.openPack('u1', 'p1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
