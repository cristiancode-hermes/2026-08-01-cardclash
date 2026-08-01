import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { BattlesService } from './battles.service';

class StartBattleDto {
  @IsIn(['apprentice', 'veteran', 'master'])
  difficulty: 'apprentice' | 'veteran' | 'master';

  @IsString()
  deckId: string;
}

class PlayCardDto {
  @IsString()
  cardId: string;
}

class AttackDto {
  @IsString()
  attackerId: string;

  @IsString()
  targetId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Post()
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartBattleDto) {
    return this.battlesService.start(user.id, dto.difficulty, dto.deckId);
  }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.battlesService.getHistory(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.battlesService.getBattle(user.id, id);
  }

  @Post(':id/play')
  play(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PlayCardDto) {
    return this.battlesService.playCard(user.id, id, dto.cardId);
  }

  @Post(':id/attack')
  attack(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AttackDto) {
    return this.battlesService.attackTarget(user.id, id, dto.attackerId, dto.targetId);
  }

  @Post(':id/end-turn')
  endTurn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.battlesService.endTurn(user.id, id);
  }
}
