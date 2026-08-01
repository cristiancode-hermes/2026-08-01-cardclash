import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 200 })
  gold: number;

  @Column({ default: 0 })
  dust: number;

  @Column({ default: 1000 })
  rating: number;

  @Column({ default: 'veteran' })
  defaultDifficulty: string;

  @Column({ type: 'uuid', nullable: true })
  defaultDeckId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
