import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pack, User, UserCard, Card, PackOpening } from '../entities/entities';
import type { Rarity } from '../entities/card.entity';

const DUST_VALUE: Record<Rarity, number> = {
  common: 5,
  rare: 20,
  epic: 100,
  legendary: 400,
};

@Injectable()
export class PacksService {
  constructor(
    @InjectRepository(Pack) private readonly packsRepo: Repository<Pack>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(PackOpening) private readonly openingsRepo: Repository<PackOpening>,
    private readonly dataSource: DataSource,
  ) {}

  async findPacks(): Promise<Pack[]> {
    return this.packsRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async openPack(userId: string, packId: string) {
    const pack = await this.packsRepo.findOne({ where: { id: packId, isActive: true } });
    if (!pack) throw new NotFoundException('Pack not found');

    return this.dataSource.transaction(async (manager) => {
      // Lock user row (better-sqlite3 doesn't support pessimistic locks; transactions serialize writes)
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .getOne();
      if (!user) throw new NotFoundException('User not found');
      if (user.gold < pack.price) {
        throw new BadRequestException(
          `Not enough gold: need ${pack.price}, have ${user.gold}`,
        );
      }

      // Roll rarities and pull cards
      const allCards = await manager.find(Card);
      const pulled: Card[] = [];
      const rarities = this.rollRarities(pack);
      for (const rarity of rarities) {
        const pool = allCards.filter((c) => c.rarity === rarity);
        if (pool.length === 0) continue;
        const card = pool[Math.floor(Math.random() * pool.length)];
        pulled.push(card);
      }

      // Deduct gold
      user.gold -= pack.price;
      await manager.save(User, user);

      // Grant cards, dust duplicates beyond 3 copies
      let dustGained = 0;
      const existingRows = await manager
        .getRepository(UserCard)
        .find({ where: { userId } });
      const copyMap = new Map(existingRows.map((r) => [r.cardId, r.copies]));

      for (const card of pulled) {
        const current = copyMap.get(card.id) ?? 0;
        if (current >= 3) {
          dustGained += DUST_VALUE[card.rarity];
        } else {
          copyMap.set(card.id, current + 1);
        }
      }

      // Persist updated copies
      const cardsRepo = manager.getRepository(UserCard);
      for (const [cardId, copies] of copyMap) {
        const row = existingRows.find((r) => r.cardId === cardId);
        if (row) {
          row.copies = copies;
          await cardsRepo.save(row);
        } else {
          await cardsRepo.save(cardsRepo.create({ userId, cardId, copies } as any));
        }
      }

      if (dustGained > 0) {
        user.dust = (user.dust ?? 0) + dustGained;
        await manager.save(User, user);
      }

      // Audit log
      const opening = await manager.save(PackOpening, manager.create(PackOpening, {
        userId,
        packId: pack.id,
        pulledCardIds: pulled.map((c) => c.id),
        dustGained,
      } as any)) as unknown as PackOpening;

      const freshUser = await manager.findOne(User, { where: { id: userId } });
      return {
        pulled,
        dustGained,
        opening,
        user: freshUser,
      };
    });
  }

  rollRarity(dropRates: Record<string, number>): Rarity {
    const r = Math.random();
    let acc = 0;
    for (const [rarity, weight] of Object.entries(dropRates)) {
      acc += weight;
      if (r <= acc) return rarity as Rarity;
    }
    return 'common';
  }

  private rollRarities(pack: Pack): Rarity[] {
    const rarities: Rarity[] = [];
    for (let i = 0; i < pack.cardCount; i++) {
      rarities.push(this.rollRarity(pack.dropRates as unknown as Record<string, number>));
    }
    if (pack.guaranteedRarity) {
      const hasGuaranteed = rarities.some(
        (r) => this.rarityRank(r) >= this.rarityRank(pack.guaranteedRarity!),
      );
      if (!hasGuaranteed) {
        const idx = Math.floor(Math.random() * rarities.length);
        rarities[idx] = pack.guaranteedRarity;
      }
    }
    return rarities;
  }

  private rarityRank(r: Rarity): number {
    switch (r) {
      case 'common': return 0;
      case 'rare': return 1;
      case 'epic': return 2;
      case 'legendary': return 3;
    }
  }
}
