import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type Element = 'ember' | 'tide' | 'thorn' | 'shadow' | 'storm';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Ability = 'none' | 'taunt' | 'charge' | 'poison' | 'heal';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Index('idx_cards_element')
  @Column({ length: 20 })
  element: Element;

  @Index('idx_cards_rarity')
  @Column({ length: 20 })
  rarity: Rarity;

  @Column({ default: 0 })
  cost: number;

  @Column({ default: 0 })
  attack: number;

  @Column({ default: 1 })
  health: number;

  @Column({ length: 20, default: 'none' })
  ability: Ability;

  @Column({ type: 'int', nullable: true })
  abilityValue: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  flavor: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
