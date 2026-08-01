import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  User, Card, UserCard, Pack, PackOpening, Deck, Battle, Quest, UserQuest, Achievement, UserAchievement,
} from './entities/entities';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { PacksModule } from './packs/packs.module';
import { DecksModule } from './decks/decks.module';
import { BattlesModule } from './battles/battles.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { QuestsModule } from './quests/quests.module';
import { AchievementsModule } from './achievements/achievements.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH || './data/cardclash.db',
      entities: [
        User, Card, UserCard, Pack, PackOpening, Deck, Battle, Quest, UserQuest, Achievement, UserAchievement,
      ],
      synchronize: true,
    }),
    AuthModule,
    CardsModule,
    PacksModule,
    DecksModule,
    BattlesModule,
    LeaderboardModule,
    QuestsModule,
    AchievementsModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
