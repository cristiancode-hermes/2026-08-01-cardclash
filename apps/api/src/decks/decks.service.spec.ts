import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DecksService, MIN_DECK_SIZE, MAX_DECK_SIZE, MAX_COPIES } from './decks.service';
import { Deck, UserCard, Card } from '../entities/entities';

describe('DecksService', () => {
  let service: DecksService;

  const deckRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((d) => d),
    save: jest.fn((e) => Promise.resolve(e)),
    remove: jest.fn(),
  };
  const userCardsRepo = { find: jest.fn() };
  const cardsRepo = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: getRepositoryToken(Deck), useValue: deckRepo },
        { provide: getRepositoryToken(UserCard), useValue: userCardsRepo },
        { provide: getRepositoryToken(Card), useValue: cardsRepo },
      ],
    }).compile();
    service = moduleRef.get(DecksService);
  });

  const cardIds = (n: number) => Array.from({ length: n }, (_, i) => `card-${i + 1}`);

  describe('validateDeck', () => {
    it('accepts a legal deck of exactly 15 unique owned cards', async () => {
      userCardsRepo.find.mockResolvedValue(cardIds(15).map((id) => ({ userId: 'u1', cardId: id, copies: 1 })));
      const result = await service.validateDeck('u1', cardIds(15));
      expect(result.valid).toBe(true);
      expect(result.cardCount).toBe(15);
    });

    it('rejects a deck smaller than the minimum size', async () => {
      userCardsRepo.find.mockResolvedValue([]);
      const result = await service.validateDeck('u1', cardIds(5));
      expect(result.valid).toBe(false);
      expect(result.errors.join()).toContain(String(MIN_DECK_SIZE));
    });

    it('rejects a deck larger than the maximum size', async () => {
      userCardsRepo.find.mockResolvedValue(cardIds(MAX_DECK_SIZE + 5).map((id) => ({ userId: 'u1', cardId: id, copies: 1 })));
      const result = await service.validateDeck('u1', cardIds(MAX_DECK_SIZE + 5));
      expect(result.valid).toBe(false);
      expect(result.errors.join()).toContain(String(MAX_DECK_SIZE));
    });

    it('rejects more than MAX_COPIES of the same card', async () => {
      userCardsRepo.find.mockResolvedValue([{ userId: 'u1', cardId: 'card-1', copies: MAX_COPIES }]);
      const result = await service.validateDeck('u1', ['card-1', 'card-1', 'card-1', 'card-1', ...cardIds(11)]);
      expect(result.valid).toBe(false);
      expect(result.errors.join()).toContain(`Maximum ${MAX_COPIES} copies`);
    });

    it('rejects cards the user does not own', async () => {
      userCardsRepo.find.mockResolvedValue([{ userId: 'u1', cardId: 'card-1', copies: 1 }]);
      const result = await service.validateDeck('u1', ['card-1', ...cardIds(14).map((_, i) => `owned-${i}`)]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('You own 0 copies'))).toBe(true);
    });
  });

  describe('create', () => {
    it('throws BadRequestException for an invalid deck', async () => {
      userCardsRepo.find.mockResolvedValue([]);
      await expect(service.create('u1', { name: 'Bad', cardIds: cardIds(5) })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the first deck as default', async () => {
      userCardsRepo.find.mockResolvedValue(cardIds(15).map((id) => ({ userId: 'u1', cardId: id, copies: 1 })));
      deckRepo.find.mockResolvedValue([]);
      await service.create('u1', { name: 'First', cardIds: cardIds(15) });
      expect(deckRepo.create).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true }));
    });
  });

  describe('findOne/remove', () => {
    it('throws NotFoundException when the deck is missing', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes an owned deck', async () => {
      const deck = { id: 'd1', userId: 'u1', name: 'X', cardIds: [] };
      deckRepo.findOne.mockResolvedValue(deck);
      const result = await service.remove('u1', 'd1');
      expect(deckRepo.remove).toHaveBeenCalledWith(deck);
      expect(result.message).toContain('deleted');
    });
  });

  describe('manaCurve', () => {
    it('returns an 8-slot curve', () => {
      const curve = service.manaCurve({ id: 'd1', userId: 'u1', name: 'X', cardIds: cardIds(15) } as any);
      expect(curve.length).toBe(8);
      expect(curve.every((v) => v === 0)).toBe(true);
    });
  });
});
