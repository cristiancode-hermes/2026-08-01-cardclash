import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, UserCard } from '../entities/entities';

export interface CollectionItem {
  card: Card;
  copies: number;
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
  ) {}

  async findAll(): Promise<Card[]> {
    return this.cardsRepo.find({ order: { cost: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<Card> {
    const card = await this.cardsRepo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  async getCollection(userId: string): Promise<CollectionItem[]> {
    const cards = await this.cardsRepo.find();
    const owned = await this.userCardsRepo.find({ where: { userId } });
    const copyMap = new Map(owned.map((o) => [o.cardId, o.copies]));
    return cards.map((card) => ({
      card,
      copies: copyMap.get(card.id) ?? 0,
    }));
  }
}
