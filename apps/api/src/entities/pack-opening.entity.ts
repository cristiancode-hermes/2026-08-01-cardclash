import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pack_openings')
export class PackOpening {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_openings_user')
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  packId: string;

  @Column({ type: 'simple-json' })
  pulledCardIds: string[];

  @Column({ default: 0 })
  dustGained: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
