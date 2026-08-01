import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck, UserCard, Card } from '../entities/entities';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, UserCard, Card])],
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
