import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('user_cards')
@Unique(['userId', 'cardId'])
export class UserCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_usercards_user')
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  cardId: string;

  @Column({ default: 0 })
  copies: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
