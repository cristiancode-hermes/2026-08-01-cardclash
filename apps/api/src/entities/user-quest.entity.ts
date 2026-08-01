import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('user_quests')
@Unique(['userId', 'questId', 'questDate'])
export class UserQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  questId: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  claimedAt: Date | null;

  @Column({ length: 10 })
  questDate: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
