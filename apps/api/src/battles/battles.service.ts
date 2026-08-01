import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Battle, User, Deck, Card } from '../entities/entities';
import {
  BattleState,
  createBattleState,
  playCard,
  attack,
  endPlayerTurn,
  startEnemyTurn,
  startPlayerTurn,
  checkGameEnd,
  serialize,
} from './battle-engine';
import { AiOpponentService, Difficulty } from './ai-opponent.service';

const DIFFICULTY_RATING: Record<Difficulty, number> = {
  apprentice: 800,
  veteran: 1200,
  master: 1600,
};

const AI_DECK_NAMES: Record<Difficulty, string[]> = {
  apprentice: ['Cinder Imp', 'Flame Sprite', 'Tidecaller', 'Bubblefin', 'Thornling', 'Nightbat', 'Shadow Wisp', 'Storm Sparrow', 'Gale Drifter', 'Blaze Sentinel'],
  veteran: ['Ember Hound', 'Tidecaller', 'Vine Strangler', 'Shadow Wisp', 'Storm Sparrow', 'Blaze Sentinel', 'Deepscale', 'Ironbark Guard', 'Void Stalker', 'Frostmaw'],
  master: ['Ember Hound', 'Vine Strangler', 'Void Stalker', 'Deepscale', 'Ironbark Guard', 'Frostmaw', 'Pyrelord', 'Abyssal Terror', 'Stormcaller', 'Cinder Imp'],
};

export interface BattleResult {
  result: 'win' | 'loss' | 'draw';
  xpEarned: number;
  goldEarned: number;
  ratingDelta: number;
  turns: number;
}

@Injectable()
export class BattlesService {
  constructor(
    @InjectRepository(Battle) private readonly battlesRepo: Repository<Battle>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Deck) private readonly decksRepo: Repository<Deck>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    private readonly aiOpponent: AiOpponentService,
    private readonly dataSource: DataSource,
  ) {}

  async start(userId: string, difficulty: Difficulty, deckId: string) {
    const deck = await this.decksRepo.findOne({ where: { id: deckId, userId } });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.cardIds.length < 15) {
      throw new BadRequestException('Deck must have at least 15 cards to battle');
    }

    const allCards = await this.cardsRepo.find();
    const byId = new Map(allCards.map((c) => [c.id, c]));

    const playerDeck = deck.cardIds.map((id) => byId.get(id)).filter(Boolean) as Card[];
    if (playerDeck.length < 15) {
      throw new BadRequestException('Deck references missing cards');
    }

    // Build AI deck
    const aiNames = AI_DECK_NAMES[difficulty];
    const byName = new Map(allCards.map((c) => [c.name, c]));
    const aiDeck: Card[] = [];
    for (let i = 0; i < 30; i++) {
      const name = aiNames[i % aiNames.length];
      const card = byName.get(name);
      if (card) aiDeck.push(card);
    }
    if (aiDeck.length < 15) {
      // Fallback: any cards
      const fallback = allCards.filter((c) => c.cost <= 4);
      while (aiDeck.length < 30 && fallback.length > 0) {
        aiDeck.push(fallback[aiDeck.length % fallback.length]);
      }
    }

    const battleId = crypto.randomUUID();
    const state = createBattleState(battleId, playerDeck, aiDeck);

    const battle = await this.battlesRepo.save(
      this.battlesRepo.create({
        id: battleId,
        userId,
        deckId: deck.id,
        difficulty,
        result: null,
        turns: null,
        xpEarned: 0,
        goldEarned: 0,
        ratingDelta: 0,
        state,
      } as any),
    ) as unknown as Battle;

    return serialize(state);
  }

  async getBattle(userId: string, battleId: string): Promise<BattleState> {
    const battle = await this.getBattleEntity(userId, battleId);
    return serialize(battle.state as BattleState);
  }

  private async getBattleEntity(userId: string, battleId: string): Promise<Battle> {
    const battle = await this.battlesRepo.findOne({ where: { id: battleId, userId } });
    if (!battle) throw new NotFoundException('Battle not found');
    return battle;
  }

  async playCard(userId: string, battleId: string, cardId: string) {
    const battle = await this.getBattleEntity(userId, battleId);
    if (battle.result) throw new BadRequestException('Battle already finished');
    const state = serialize(battle.state as BattleState);
    if (state.phase !== 'player') throw new BadRequestException('Not your turn');

    const handIndex = state.player.hand.findIndex((c) => c.id === cardId);
    if (handIndex === -1) throw new BadRequestException('Card not in hand');

    const result = playCard(state, 'player', handIndex);
    if (result.error) throw new BadRequestException(result.error);

    battle.state = result.state;
    const end = checkGameEnd(result.state);
    if (end) {
      await this.finishBattle(battle, end.phase);
    } else {
      await this.battlesRepo.save(battle);
    }
    return serialize(battle.state as BattleState);
  }

  async attackTarget(userId: string, battleId: string, attackerId: string, targetId: string) {
    const battle = await this.getBattleEntity(userId, battleId);
    if (battle.result) throw new BadRequestException('Battle already finished');
    const state = serialize(battle.state as BattleState);
    if (state.phase !== 'player') throw new BadRequestException('Not your turn');

    const result = attack(state, 'player', attackerId, targetId);
    if (result.error) throw new BadRequestException(result.error);

    battle.state = result.state;
    const end = checkGameEnd(result.state);
    if (end) {
      await this.finishBattle(battle, end.phase);
    } else {
      await this.battlesRepo.save(battle);
    }
    return serialize(battle.state as BattleState);
  }

  async endTurn(userId: string, battleId: string) {
    const battle = await this.getBattleEntity(userId, battleId);
    if (battle.result) throw new BadRequestException('Battle already finished');
    let state = serialize(battle.state as BattleState);
    if (state.phase !== 'player') throw new BadRequestException('Not your turn');

    state = endPlayerTurn(state);
    state = startEnemyTurn(state);

    // AI resolves its turn
    state = this.resolveAiTurn(state, battle.difficulty as Difficulty);

    const end = checkGameEnd(state);
    if (end) {
      battle.state = state;
      await this.finishBattle(battle, end.phase);
    } else {
      state = startPlayerTurn(state);
      battle.state = state;
      await this.battlesRepo.save(battle);
    }
    return serialize(battle.state as BattleState);
  }

  private resolveAiTurn(state: BattleState, difficulty: Difficulty): BattleState {
    // Play one card
    const decision = this.aiOpponent.chooseAction(state, difficulty);
    if (decision.playHandIndex !== null) {
      const playResult = playCard(state, 'enemy', decision.playHandIndex);
      if (!playResult.error) state = playResult.state;
    }
    // Attacks
    const decision2 = this.aiOpponent.chooseAction(state, difficulty);
    for (const atk of decision2.attacks) {
      const attackResult = attack(state, 'enemy', atk.attackerInstanceId, atk.targetInstanceId);
      if (!attackResult.error) state = attackResult.state;
      if (checkGameEnd(state)) break;
    }
    return state;
  }

  private async finishBattle(battle: Battle, phase: 'victory' | 'defeat' | 'draw') {
    const user = await this.usersRepo.findOne({ where: { id: battle.userId } });
    if (!user) throw new NotFoundException('User not found');

    const result: BattleResult = {
      result: phase === 'victory' ? 'win' : phase === 'defeat' ? 'loss' : 'draw',
      xpEarned: 0,
      goldEarned: 0,
      ratingDelta: 0,
      turns: (battle.state as BattleState).turn,
    };

    const enemyRating = DIFFICULTY_RATING[battle.difficulty as Difficulty] ?? 1200;

    if (result.result === 'win') {
      result.xpEarned = 45;
      result.goldEarned = 30;
      result.ratingDelta = this.eloDelta(user.rating, enemyRating, 1);
    } else if (result.result === 'loss') {
      result.xpEarned = 10;
      result.goldEarned = 5;
      result.ratingDelta = this.eloDelta(user.rating, enemyRating, 0);
    } else {
      result.xpEarned = 20;
      result.goldEarned = 15;
      result.ratingDelta = 0;
    }

    battle.result = result.result;
    battle.turns = result.turns;
    battle.xpEarned = result.xpEarned;
    battle.goldEarned = result.goldEarned;
    battle.ratingDelta = result.ratingDelta;
    battle.completedAt = new Date();

    user.xp = (user.xp ?? 0) + result.xpEarned;
    user.gold = (user.gold ?? 0) + result.goldEarned;
    user.rating = Math.max(0, (user.rating ?? 1000) + result.ratingDelta);
    user.level = this.levelFromXp(user.xp);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(User, user);
      await manager.save(Battle, battle);
    });
  }

  private eloDelta(playerRating: number, opponentRating: number, score: 0 | 1): number {
    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return Math.round(32 * (score - expected));
  }

  private levelFromXp(xp: number): number {
    return Math.floor(xp / 100) + 1;
  }

  async getHistory(userId: string) {
    const battles = await this.battlesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const summary = battles.reduce(
      (acc, b) => {
        if (b.result === 'win') acc.wins += 1;
        else if (b.result === 'loss') acc.losses += 1;
        else if (b.result === 'draw') acc.draws += 1;
        return acc;
      },
      { wins: 0, losses: 0, draws: 0 },
    );
    return {
      battles: battles.map((b) => ({
        id: b.id,
        difficulty: b.difficulty,
        result: b.result,
        turns: b.turns,
        xpEarned: b.xpEarned,
        goldEarned: b.goldEarned,
        ratingDelta: b.ratingDelta,
        createdAt: b.createdAt,
      })),
      summary,
    };
  }
}
