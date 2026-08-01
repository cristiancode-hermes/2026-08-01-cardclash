import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck, UserCard, Card } from '../entities/entities';

export interface DeckValidation {
  valid: boolean;
  errors: string[];
  cardCount: number;
}

export const MIN_DECK_SIZE = 15;
export const MAX_DECK_SIZE = 30;
export const MAX_COPIES = 3;

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck) private readonly decksRepo: Repository<Deck>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
  ) {}

  async findAll(userId: string): Promise<Deck[]> {
    return this.decksRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, id: string): Promise<Deck> {
    const deck = await this.decksRepo.findOne({ where: { id, userId } });
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async create(userId: string, dto: { name: string; cardIds: string[] }) {
    const validation = await this.validateDeck(userId, dto.cardIds);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
    const existing = await this.decksRepo.find({ where: { userId } });
    const deck = await this.decksRepo.save(
      this.decksRepo.create({
        userId,
        name: dto.name,
        cardIds: dto.cardIds,
        isDefault: existing.length === 0,
      } as any),
    ) as unknown as Deck;
    return deck;
  }

  async update(userId: string, id: string, dto: { name?: string; cardIds?: string[] }) {
    const deck = await this.findOne(userId, id);
    if (dto.name !== undefined) deck.name = dto.name;
    if (dto.cardIds !== undefined) {
      const validation = await this.validateDeck(userId, dto.cardIds);
      if (!validation.valid) {
        throw new BadRequestException(validation.errors.join('; '));
      }
      deck.cardIds = dto.cardIds;
    }
    const saved = await this.decksRepo.save(deck) as unknown as Deck;
    return saved;
  }

  async remove(userId: string, id: string) {
    const deck = await this.findOne(userId, id);
    await this.decksRepo.remove(deck);
    return { message: 'Deck deleted' };
  }

  async validateDeck(userId: string, cardIds: string[]): Promise<DeckValidation> {
    const errors: string[] = [];
    if (cardIds.length < MIN_DECK_SIZE) {
      errors.push(`Deck must have at least ${MIN_DECK_SIZE} cards (has ${cardIds.length})`);
    }
    if (cardIds.length > MAX_DECK_SIZE) {
      errors.push(`Deck cannot have more than ${MAX_DECK_SIZE} cards (has ${cardIds.length})`);
    }

    // Copy limits
    const counts = new Map<string, number>();
    for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, count] of counts) {
      if (count > MAX_COPIES) {
        errors.push(`Maximum ${MAX_COPIES} copies per card (card ${id} has ${count})`);
      }
    }

    // Ownership check
    const uniqueIds = [...counts.keys()];
    const owned = uniqueIds.length
      ? await this.userCardsRepo.find({ where: { userId } })
      : [];
    const ownedMap = new Map(owned.map((o) => [o.cardId, o.copies]));
    for (const [id, count] of counts) {
      const ownedCopies = ownedMap.get(id) ?? 0;
      if (ownedCopies < count) {
        errors.push(`You own ${ownedCopies} copies of a card but the deck uses ${count}`);
      }
    }

    return { valid: errors.length === 0, errors, cardCount: cardIds.length };
  }

  async deckCards(deck: Deck): Promise<{ card: Card; copies: number }[]> {
    const counts = new Map<string, number>();
    for (const id of deck.cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const cards = await this.cardsRepo.find();
    const byId = new Map(cards.map((c) => [c.id, c]));
    const result: { card: Card; copies: number }[] = [];
    for (const [id, copies] of counts) {
      const card = byId.get(id);
      if (card) result.push({ card, copies });
    }
    return result;
  }

  manaCurve(deck: Deck): number[] {
    const curve = [0, 0, 0, 0, 0, 0, 0, 0];
    const counts = new Map<string, number>();
    for (const id of deck.cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    void counts;
    return curve;
  }
}
