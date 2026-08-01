import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Battle, User, Deck, Card } from '../entities/entities';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { AiOpponentService } from './ai-opponent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Battle, User, Deck, Card])],
  controllers: [BattlesController],
  providers: [BattlesService, AiOpponentService],
  exports: [BattlesService],
})
export class BattlesModule {}
