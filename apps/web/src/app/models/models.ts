// ---------- CardClash domain models ----------

export type Element = 'ember' | 'tide' | 'thorn' | 'shadow' | 'storm';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Difficulty = 'apprentice' | 'veteran' | 'master';
export type BattlePhase = 'player' | 'enemy' | 'victory' | 'defeat' | 'draw';
export type Ability = 'taunt' | 'charge' | 'poison' | 'heal' | null;

export interface User {
  id: string;
  email: string;
  username: string;
  xp: number;
  level: number;
  gold: number;
  dust: number;
  rating: number;
  defaultDifficulty: Difficulty;
  defaultDeckId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Card {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  cost: number;
  attack: number;
  health: number;
  ability: Ability;
  abilityValue: number | null;
  description: string | null;
  flavor: string | null;
  createdAt: string;
}

export interface CollectionItem {
  card: Card;
  copies: number;
}

export interface Pack {
  id: string;
  name: string;
  price: number;
  cardCount: number;
  dropRates: Record<string, number>;
  guaranteedRarity: Rarity | null;
  isActive: boolean;
  createdAt: string;
}

export interface PackOpening {
  id: string;
  userId: string;
  packId: string;
  pulledCardIds: string[];
  dustGained: number;
  createdAt: string;
}

export interface OpenPackResult {
  pulled: Card[];
  dustGained: number;
  opening: PackOpening;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  cardIds: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  cards?: { card: Card; copies: number }[];
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

export interface BattleEvent {
  action: string;
  actor: 'player' | 'enemy';
  text: string;
  turn: number;
}

export interface BattleState {
  battleId: string;
  phase: BattlePhase;
  turn: number;
  player: SideState;
  enemy: SideState;
  log: BattleEvent[];
}

export interface BattleSummary {
  id: string;
  difficulty: Difficulty;
  result: 'win' | 'loss' | 'draw';
  turns: number;
  xpEarned: number;
  goldEarned: number;
  ratingDelta: number;
  createdAt: string;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  rating: number;
  level: number;
  wins: number;
  losses: number;
}

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
  myRank: number | null;
}

export interface UserQuestView {
  id: string;
  questId: string;
  type: string;
  title: string;
  description: string | null;
  target: number;
  progress: number;
  isCompleted: boolean;
  claimedAt: string | null;
  rewardGold: number;
  rewardXp: number;
  isDaily: boolean;
}

export interface AchievementView {
  id: string;
  type: string;
  name: string;
  description: string | null;
  target: number;
  rewardGold: number;
  rewardXp: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface ClaimResult {
  rewards: { gold: number; xp: number };
  user: User;
}
