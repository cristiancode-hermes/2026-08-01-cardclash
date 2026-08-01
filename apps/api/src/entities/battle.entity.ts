import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('battles')
export class Battle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_battles_user_created')
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  deckId: string | null;

  @Column({ length: 20 })
  difficulty: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  result: 'win' | 'loss' | 'draw' | null;

  @Column({ type: 'int', nullable: true })
  turns: number | null;

  @Column({ default: 0 })
  xpEarned: number;

  @Column({ default: 0 })
  goldEarned: number;

  @Column({ default: 0 })
  ratingDelta: number;

  @Column({ type: 'simple-json' })
  state: unknown;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;
}
