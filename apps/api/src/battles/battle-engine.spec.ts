import {
  createBattleState,
  canPlayCard,
  playCard,
  attack,
  getValidAttackTargets,
  checkGameEnd,
  startPlayerTurn,
  endPlayerTurn,
  startEnemyTurn,
  MAX_BOARD_SIZE,
  MAX_TURNS,
  STARTING_HERO_HP,
} from './battle-engine';
import type { Card } from '../entities/card.entity';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    name: 'Test Minion',
    element: 'ember',
    rarity: 'common',
    cost: 2,
    attack: 3,
    health: 4,
    ability: null,
    abilityValue: null,
    description: null,
    flavor: null,
    createdAt: new Date(),
    ...overrides,
  } as Card;
}

function makeDeck(size = 10): Card[] {
  return Array.from({ length: size }, (_, i) =>
    makeCard({ id: `card-${i + 1}`, name: `Minion ${i + 1}`, cost: 1 }),
  );
}

describe('BattleEngine', () => {
  it('creates a battle state with 30 HP, 1 mana and 3-card hands', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    expect(state.phase).toBe('player');
    expect(state.turn).toBe(1);
    expect(state.player.heroHp).toBe(STARTING_HERO_HP);
    expect(state.player.mana).toBe(1);
    expect(state.player.hand.length).toBe(3);
    expect(state.enemy.hand.length).toBe(3);
  });

  it('allows playing an affordable card and deducts mana', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    const card = state.player.hand[0];
    const result = playCard(state, 'player', 0);
    expect(result.error).toBeUndefined();
    expect(state.player.mana).toBe(1 - card.cost);
    expect(state.player.board.length).toBe(1);
    expect(state.player.board[0].name).toBe(card.name);
    expect(state.player.board[0].canAttack).toBe(false); // no charge
  });

  it('rejects a card the player cannot afford', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    // Force an expensive card into hand
    state.player.hand = [makeCard({ id: 'expensive', cost: 10 })];
    const result = playCard(state, 'player', 0);
    expect(result.error).toContain('mana');
    expect(state.player.board.length).toBe(0);
  });

  it('rejects playing on the enemy turn', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    endPlayerTurn(state);
    const result = playCard(state, 'player', 0);
    expect(result.error).toBe('Not your turn');
  });

  it('rejects attacking with a minion that cannot attack yet', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    playCard(state, 'player', 0);
    const minion = state.player.board[0];
    const result = attack(state, 'player', minion.instanceId, 'hero');
    expect(result.error).toContain('cannot attack');
  });

  it('allows a charge minion to attack the hero immediately', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.hand = [makeCard({ id: 'charger', cost: 1, attack: 3, ability: 'charge' })];
    playCard(state, 'player', 0);
    const minion = state.player.board[0];
    const result = attack(state, 'player', minion.instanceId, 'hero');
    expect(result.error).toBeUndefined();
    expect(state.enemy.heroHp).toBe(STARTING_HERO_HP - 3);
  });

  it('blocks hero attacks when the opponent has a Taunt minion', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.hand = [makeCard({ id: 'charger', cost: 1, attack: 3, ability: 'charge' })];
    playCard(state, 'player', 0);
    state.enemy.board = [
      {
        instanceId: 'e1',
        cardId: 'taunt',
        name: 'Taunt Wall',
        attack: 1,
        health: 5,
        maxHealth: 5,
        abilities: ['taunt'],
        canAttack: false,
        element: 'thorn',
        isTaunt: true,
        isCharge: false,
        isPoison: false,
      },
    ];
    const valid = getValidAttackTargets(state, 'player');
    expect(valid.heroAvailable).toBe(false);
    expect(valid.minions.length).toBe(1);
    const minion = state.player.board[0];
    const result = attack(state, 'player', minion.instanceId, 'hero');
    expect(result.error).toContain('Taunt');
  });

  it('lets a poison minion destroy a defender without retaliation', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.hand = [makeCard({ id: 'viper', cost: 1, attack: 1, health: 2, ability: 'poison' })];
    playCard(state, 'player', 0);
    const attacker = state.player.board[0];
    attacker.canAttack = true; // poison minion is ready to strike this turn
    state.enemy.board = [
      {
        instanceId: 'e1',
        cardId: 'victim',
        name: 'Victim',
        attack: 5,
        health: 5,
        maxHealth: 5,
        abilities: [],
        canAttack: false,
        element: 'tide',
        isTaunt: false,
        isCharge: false,
        isPoison: false,
      },
    ];
    attack(state, 'player', attacker.instanceId, 'e1');
    expect(state.enemy.board.length).toBe(0); // victim destroyed
    expect(state.player.board[0].health).toBe(2); // no retaliation taken
  });

  it('ends the game when the enemy hero reaches 0 HP (victory)', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.hand = [makeCard({ id: 'finisher', cost: 1, attack: 30, ability: 'charge' })];
    playCard(state, 'player', 0);
    attack(state, 'player', state.player.board[0].instanceId, 'hero');
    expect(state.enemy.heroHp).toBe(0);
    const result = checkGameEnd(state);
    expect(result?.phase).toBe('victory');
  });

  it('ends the game in defeat when the player hero dies', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.heroHp = 5;
    state.enemy.board = [
      {
        instanceId: 'e1',
        cardId: 'killer',
        name: 'Killer',
        attack: 10,
        health: 1,
        maxHealth: 1,
        abilities: ['charge'],
        canAttack: true,
        element: 'shadow',
        isTaunt: false,
        isCharge: true,
        isPoison: false,
      },
    ];
    endPlayerTurn(state);
    attack(state, 'enemy', 'e1', 'hero');
    expect(state.player.heroHp).toBe(-5);
    const result = checkGameEnd(state);
    expect(result?.phase).toBe('defeat');
  });

  it('draws a draw after MAX_TURNS', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.turn = MAX_TURNS;
    const result = checkGameEnd(state);
    expect(result?.phase).toBe('draw');
  });

  it('starts a player turn: +1 mana, full mana, cards can attack, draw 1', () => {
    const state = createBattleState('b1', makeDeck(20), makeDeck());
    playCard(state, 'player', 0);
    state.player.mana = 0;
    startPlayerTurn(state);
    expect(state.turn).toBe(2);
    expect(state.player.manaMax).toBe(2);
    expect(state.player.mana).toBe(2);
    expect(state.player.hand.length).toBe(3); // drew 1 after playing 1 (3 - 1 + 1)
    state.player.board.forEach((m) => expect(m.canAttack).toBe(true));
  });

  it('enforces the board size limit of 5 minions', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    state.player.board = Array.from({ length: MAX_BOARD_SIZE }, (_, i) => ({
      instanceId: `m${i}`,
      cardId: `c${i}`,
      name: `M${i}`,
      attack: 1,
      health: 1,
      maxHealth: 1,
      abilities: [],
      canAttack: false,
      element: 'ember',
      isTaunt: false,
      isCharge: false,
      isPoison: false,
    }));
    state.player.hand = [makeCard({ id: 'extra', cost: 1 })];
    const result = playCard(state, 'player', 0);
    expect(result.error).toContain('Board is full');
  });

  it('lets the enemy turn progress after endPlayerTurn', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    endPlayerTurn(state);
    expect(state.phase).toBe('enemy');
    startEnemyTurn(state);
    expect(state.enemy.manaMax).toBe(2);
    expect(state.enemy.hand.length).toBe(4);
  });
});

describe('canPlayCard', () => {
  it('returns null for a legal play', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    expect(canPlayCard(state, 'player', 0)).toBeNull();
  });

  it('returns an error when not your turn', () => {
    const state = createBattleState('b1', makeDeck(), makeDeck());
    endPlayerTurn(state);
    expect(canPlayCard(state, 'player', 0)).toBe('Not your turn');
  });
});
