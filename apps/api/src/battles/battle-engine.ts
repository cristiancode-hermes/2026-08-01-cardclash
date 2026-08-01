import type { Card, Element } from '../entities/card.entity';

export type BattlePhase = 'player' | 'enemy' | 'victory' | 'defeat' | 'draw';
export type BattleAction = 'play' | 'attack' | 'end_turn' | 'draw' | 'summon' | 'heal';

export interface BattleEvent {
  action: BattleAction;
  actor: 'player' | 'enemy';
  text: string;
  turn: number;
}

export interface Minion {
  instanceId: string;
  cardId: string;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  abilities: string[];
  canAttack: boolean;
  element: Element;
  isTaunt: boolean;
  isCharge: boolean;
  isPoison: boolean;
}

export interface SideState {
  heroHp: number;
  heroMaxHp: number;
  mana: number;
  manaMax: number;
  hand: Card[];
  board: Minion[];
  deck: Card[];
}

export interface BattleState {
  battleId: string;
  phase: BattlePhase;
  turn: number;
  player: SideState;
  enemy: SideState;
  log: BattleEvent[];
}

export const MAX_BOARD_SIZE = 5;
export const MAX_TURNS = 40;
export const STARTING_HERO_HP = 30;
export const STARTING_HAND_SIZE = 3;

let instanceCounter = 0;

function nextInstanceId(): string {
  instanceCounter += 1;
  return `minion_${instanceCounter}`;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cardAbilities(card: Card): string[] {
  return card.ability && card.ability !== 'none' ? [card.ability] : [];
}

function makeSide(deck: Card[], heroHp: number): SideState {
  return {
    heroHp,
    heroMaxHp: heroHp,
    mana: 0,
    manaMax: 0,
    hand: [],
    board: [],
    deck: shuffle(deck),
  };
}

function drawCards(side: SideState, count: number) {
  for (let i = 0; i < count; i++) {
    const card = side.deck.shift();
    if (card) side.hand.push(card);
  }
}

export function createBattleState(
  battleId: string,
  playerDeck: Card[],
  enemyDeck: Card[],
  playerHeroHp = STARTING_HERO_HP,
  enemyHeroHp = STARTING_HERO_HP,
): BattleState {
  instanceCounter = 0;
  const state: BattleState = {
    battleId,
    phase: 'player',
    turn: 1,
    player: makeSide(playerDeck, playerHeroHp),
    enemy: makeSide(enemyDeck, enemyHeroHp),
    log: [],
  };
  // Turn 1: mana 1, draw 3 each
  state.player.mana = 1;
  state.player.manaMax = 1;
  state.enemy.mana = 1;
  state.enemy.manaMax = 1;
  drawCards(state.player, STARTING_HAND_SIZE);
  drawCards(state.enemy, STARTING_HAND_SIZE);
  state.log.push({ action: 'draw', actor: 'player', text: 'Battle begins! Turn 1 — you go first.', turn: 1 });
  return state;
}

export function canPlayCard(state: BattleState, side: 'player' | 'enemy', handIndex: number): string | null {
  if (state.phase !== side) return 'Not your turn';
  const s = state[side];
  const card = s.hand[handIndex];
  if (!card) return 'Card not in hand';
  if (card.cost > s.mana) return `Not enough mana (need ${card.cost}, have ${s.mana})`;
  if (s.board.length >= MAX_BOARD_SIZE) return 'Board is full (max 5 minions)';
  return null;
}

export function playCard(state: BattleState, side: 'player' | 'enemy', handIndex: number): { state: BattleState; error?: string } {
  const error = canPlayCard(state, side, handIndex);
  if (error) return { state, error };

  const s = state[side];
  const opponent = state[side === 'player' ? 'enemy' : 'player'];
  const card = s.hand.splice(handIndex, 1)[0];
  s.mana -= card.cost;

  const abilities = cardAbilities(card);
  const isCharge = abilities.includes('charge');
  const minion: Minion = {
    instanceId: nextInstanceId(),
    cardId: card.id,
    name: card.name,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    abilities,
    canAttack: isCharge,
    element: card.element,
    isTaunt: abilities.includes('taunt'),
    isCharge,
    isPoison: abilities.includes('poison'),
  };

  // Heal ability: heal hero by abilityValue
  if (card.ability === 'heal' && card.abilityValue) {
    s.heroHp = Math.min(s.heroMaxHp, s.heroHp + card.abilityValue);
    state.log.push({
      action: 'heal',
      actor: side,
      text: `${card.name} heals the hero for ${card.abilityValue}.`,
      turn: state.turn,
    });
  }

  s.board.push(minion);
  state.log.push({
    action: 'summon',
    actor: side,
    text: `${side === 'player' ? 'You' : 'Enemy'} summon ${card.name} (${card.attack}/${card.health})${isCharge ? ' with Charge' : ''}.`,
    turn: state.turn,
  });
  void opponent;
  return { state };
}

export function getValidAttackTargets(state: BattleState, side: 'player' | 'enemy'): { minions: Minion[]; heroAvailable: boolean } {
  const opponent = state[side === 'player' ? 'enemy' : 'player'];
  const taunters = opponent.board.filter((m) => m.isTaunt && m.health > 0);
  if (taunters.length > 0) {
    return { minions: taunters, heroAvailable: false };
  }
  return { minions: opponent.board.filter((m) => m.health > 0), heroAvailable: true };
}

export function attack(
  state: BattleState,
  side: 'player' | 'enemy',
  attackerInstanceId: string,
  targetInstanceId: string | 'hero',
): { state: BattleState; error?: string } {
  if (state.phase !== side) return { state, error: 'Not your turn' };
  const s = state[side];
  const opponent = state[side === 'player' ? 'enemy' : 'player'];

  const attacker = s.board.find((m) => m.instanceId === attackerInstanceId);
  if (!attacker) return { state, error: 'Attacker not found' };
  if (!attacker.canAttack) return { state, error: `${attacker.name} cannot attack yet` };

  const valid = getValidAttackTargets(state, side);
  if (targetInstanceId === 'hero') {
    if (!valid.heroAvailable) return { state, error: 'A Taunt minion blocks your attack on the hero' };
    opponent.heroHp -= attacker.attack;
    state.log.push({
      action: 'attack',
      actor: side,
      text: `${side === 'player' ? 'You' : 'Enemy'} attack the hero with ${attacker.name} for ${attacker.attack} damage.`,
      turn: state.turn,
    });
  } else {
    const target = valid.minions.find((m) => m.instanceId === targetInstanceId);
    if (!target) return { state, error: 'Target not found or protected by Taunt' };

    // Poison: destroy defender without retaliation
    if (attacker.isPoison) {
      target.health = 0;
      state.log.push({
        action: 'attack',
        actor: side,
        text: `${attacker.name} poisons ${target.name} — it is destroyed!`,
        turn: state.turn,
      });
    } else {
      target.health -= attacker.attack;
      attacker.health -= target.attack;
      state.log.push({
        action: 'attack',
        actor: side,
        text: `${attacker.name} attacks ${target.name}: ${attacker.attack} damage dealt, ${target.attack} taken.`,
        turn: state.turn,
      });
    }

    if (attacker.health <= 0) {
      state.log.push({ action: 'attack', actor: side, text: `${attacker.name} is destroyed in combat.`, turn: state.turn });
    }
  }

  // Remove dead minions
  s.board = s.board.filter((m) => m.health > 0);
  opponent.board = opponent.board.filter((m) => m.health > 0);
  attacker.canAttack = false;

  // Check for game end
  const result = checkGameEnd(state);
  if (result) return { state };

  return { state };
}

export function checkGameEnd(state: BattleState): { phase: 'victory' | 'defeat' | 'draw' } | null {
  if (state.player.heroHp <= 0) return { phase: 'defeat' };
  if (state.enemy.heroHp <= 0) return { phase: 'victory' };
  if (state.turn >= MAX_TURNS) return { phase: 'draw' };
  return null;
}

export function startPlayerTurn(state: BattleState): BattleState {
  state.phase = 'player';
  state.turn += 1;
  state.player.manaMax = Math.min(10, state.player.manaMax + 1);
  state.player.mana = state.player.manaMax;
  state.player.board.forEach((m) => { m.canAttack = true; });
  drawCards(state.player, 1);
  state.log.push({ action: 'draw', actor: 'player', text: `Turn ${state.turn} — your mana is now ${state.player.manaMax}.`, turn: state.turn });
  return state;
}

export function endPlayerTurn(state: BattleState): BattleState {
  state.phase = 'enemy';
  state.log.push({ action: 'end_turn', actor: 'player', text: 'You end your turn.', turn: state.turn });
  return state;
}

export function startEnemyTurn(state: BattleState): BattleState {
  state.enemy.manaMax = Math.min(10, state.enemy.manaMax + 1);
  state.enemy.mana = state.enemy.manaMax;
  state.enemy.board.forEach((m) => { m.canAttack = true; });
  drawCards(state.enemy, 1);
  state.log.push({ action: 'draw', actor: 'enemy', text: `Enemy turn — mana ${state.enemy.manaMax}.`, turn: state.turn });
  return state;
}

export function serialize(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state)) as BattleState;
}
