import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  type: string;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 1 })
  target: number;

  @Column({ default: 0 })
  rewardGold: number;

  @Column({ default: 0 })
  rewardXp: number;

  @Column({ default: true })
  isDaily: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
