import { AiOpponentService } from './ai-opponent.service';
import { createBattleState, playCard } from './battle-engine';
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

describe('AiOpponentService', () => {
  let ai: AiOpponentService;

  beforeEach(() => {
    ai = new AiOpponentService();
  });

  it('plays an affordable card when it has mana', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.mana = 5;
    state.enemy.hand = [makeCard({ id: 'c1', cost: 3 })];
    const decision = ai.chooseAction(state, 'veteran');
    expect(decision.playHandIndex).toBe(0);
  });

  it('does not play a card it cannot afford', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.mana = 1;
    state.enemy.hand = [makeCard({ id: 'c1', cost: 5 })];
    const decision = ai.chooseAction(state, 'veteran');
    expect(decision.playHandIndex).toBeNull();
  });

  it('prefers the most expensive affordable card at veteran difficulty', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.mana = 10;
    state.enemy.hand = [
      makeCard({ id: 'cheap', cost: 1 }),
      makeCard({ id: 'pricey', cost: 7 }),
      makeCard({ id: 'mid', cost: 4 }),
    ];
    const decision = ai.chooseAction(state, 'veteran');
    expect(decision.playHandIndex).toBe(1);
  });

  it('attacks the hero when the player has no minions', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.board = [
      {
        instanceId: 'e1',
        cardId: 'c1',
        name: 'Attacker',
        attack: 3,
        health: 2,
        maxHealth: 2,
        abilities: [],
        canAttack: true,
        element: 'ember',
        isTaunt: false,
        isCharge: true,
        isPoison: false,
      },
    ];
    const decision = ai.chooseAction(state, 'master');
    expect(decision.attacks.length).toBe(1);
    expect(decision.attacks[0].targetInstanceId).toBe('hero');
  });

  it('attacks the weakest player minion at master difficulty', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.board = [
      {
        instanceId: 'e1',
        cardId: 'c1',
        name: 'Attacker',
        attack: 3,
        health: 2,
        maxHealth: 2,
        abilities: [],
        canAttack: true,
        element: 'ember',
        isTaunt: false,
        isCharge: true,
        isPoison: false,
      },
    ];
    state.player.board = [
      {
        instanceId: 'p1',
        cardId: 'pc1',
        name: 'Tanky',
        attack: 1,
        health: 9,
        maxHealth: 9,
        abilities: [],
        canAttack: false,
        element: 'thorn',
        isTaunt: false,
        isCharge: false,
        isPoison: false,
      },
      {
        instanceId: 'p2',
        cardId: 'pc2',
        name: 'Frail',
        attack: 1,
        health: 2,
        maxHealth: 2,
        abilities: [],
        canAttack: false,
        element: 'storm',
        isTaunt: false,
        isCharge: false,
        isPoison: false,
      },
    ];
    const decision = ai.chooseAction(state, 'master');
    expect(decision.attacks[0].targetInstanceId).toBe('p2');
  });

  it('respects a full enemy board and plays nothing', () => {
    const state = createBattleState('b1', [], []);
    state.enemy.mana = 10;
    state.enemy.board = Array.from({ length: 5 }, (_, i) => ({
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
    state.enemy.hand = [makeCard({ id: 'extra', cost: 1 })];
    const decision = ai.chooseAction(state, 'veteran');
    expect(decision.playHandIndex).toBeNull();
  });

  it('produces a fully executable action sequence against a live state', () => {
    const state = createBattleState('b1', [makeCard({ id: 'p1', cost: 1 })], [makeCard({ id: 'e1', cost: 1 })]);
    state.phase = 'enemy'; // enemy is mid-turn when AI acts
    const decision = ai.chooseAction(state, 'apprentice');
    expect(decision).toHaveProperty('playHandIndex');
    expect(decision).toHaveProperty('attacks');
    // Apprentice decision is deterministic in shape
    if (decision.playHandIndex !== null) {
      const result = playCard(state, 'enemy', decision.playHandIndex);
      expect(result.error).toBeUndefined();
    }
  });
});
