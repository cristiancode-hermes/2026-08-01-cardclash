import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User, Card, UserCard, Pack, PackOpening, Deck, Battle, Quest, UserQuest, Achievement, UserAchievement,
} from '../entities/entities';
import { SeedService } from './seed.service';
import { AiOpponentService } from '../battles/ai-opponent.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Card, UserCard, Pack, PackOpening, Deck, Battle, Quest, UserQuest, Achievement, UserAchievement,
    ]),
  ],
  providers: [SeedService, AiOpponentService],
})
export class SeedModule {}
