import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Rarity } from './card.entity';

export interface DropRates {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

@Entity('packs')
export class Pack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ default: 100 })
  price: number;

  @Column({ default: 5 })
  cardCount: number;

  @Column({ type: 'simple-json' })
  dropRates: DropRates;

  @Column({ length: 20, nullable: true })
  guaranteedRarity: Rarity | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
