import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  type: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 1 })
  target: number;

  @Column({ default: 0 })
  rewardGold: number;

  @Column({ default: 0 })
  rewardXp: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
