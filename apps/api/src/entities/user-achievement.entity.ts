import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('user_achievements')
@Unique(['userId', 'achievementId'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  achievementId: string;

  @Column({ type: 'datetime', nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
