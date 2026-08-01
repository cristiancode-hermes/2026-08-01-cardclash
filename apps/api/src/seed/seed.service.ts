import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User, Card, UserCard, Pack, PackOpening, Deck, Battle, Quest, UserQuest, Achievement, UserAchievement,
} from '../entities/entities';
import { createBattleState, startPlayerTurn, endPlayerTurn, startEnemyTurn, playCard, attack, checkGameEnd } from '../battles/battle-engine';
import { AiOpponentService } from '../battles/ai-opponent.service';

interface CardSeed {
  name: string;
  element: 'ember' | 'tide' | 'thorn' | 'shadow' | 'storm';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost: number;
  attack: number;
  health: number;
  ability?: 'taunt' | 'charge' | 'poison' | 'heal';
  abilityValue?: number;
  description?: string;
  flavor?: string;
}

const CARDS: CardSeed[] = [
  // ---- Ember ----
  { name: 'Cinder Imp', element: 'ember', rarity: 'common', cost: 1, attack: 1, health: 2, description: 'A spark given shape and spite.' },
  { name: 'Flame Sprite', element: 'ember', rarity: 'common', cost: 2, attack: 2, health: 2, ability: 'charge', description: 'Charge. It dances where you point.' },
  { name: 'Ember Hound', element: 'ember', rarity: 'common', cost: 3, attack: 3, health: 3, description: 'Loyal to the last cinder.' },
  { name: 'Blaze Sentinel', element: 'ember', rarity: 'rare', cost: 4, attack: 3, health: 5, ability: 'taunt', description: 'Taunt. The wall that burns.' },
  { name: 'Pyrelord', element: 'ember', rarity: 'epic', cost: 6, attack: 6, health: 6, ability: 'taunt', description: 'Taunt. Kings of the molten court.' },
  { name: 'Crimson Phoenix', element: 'ember', rarity: 'legendary', cost: 8, attack: 7, health: 7, ability: 'charge', description: 'Charge. Death is just a warm-up.' },
  { name: 'Warmage', element: 'ember', rarity: 'rare', cost: 3, attack: 3, health: 4, description: 'Every spell begins with fire.' },
  { name: 'Ember Serpent', element: 'ember', rarity: 'epic', cost: 5, attack: 5, health: 4, ability: 'poison', description: 'Poison. Its bite ignites the blood.' },
  { name: 'Forge Golem', element: 'ember', rarity: 'rare', cost: 5, attack: 4, health: 6, ability: 'taunt', description: 'Taunt. Hammered from the heart of a star.' },

  // ---- Tide ----
  { name: 'Tidecaller', element: 'tide', rarity: 'common', cost: 1, attack: 1, health: 3, description: 'The sea answers when called.' },
  { name: 'Bubblefin', element: 'tide', rarity: 'common', cost: 2, attack: 2, health: 3, description: 'Faster than it looks. Smellier too.' },
  { name: 'Deepscale', element: 'tide', rarity: 'common', cost: 3, attack: 3, health: 4, description: 'Armored by the pressure of the deep.' },
  { name: 'Tidal Guardian', element: 'tide', rarity: 'rare', cost: 4, attack: 3, health: 6, ability: 'taunt', description: 'Taunt. The shore breaks here.' },
  { name: 'Abyssal Terror', element: 'tide', rarity: 'legendary', cost: 9, attack: 8, health: 8, ability: 'taunt', description: 'Taunt. What the light forgot.' },
  { name: 'Mermaid Matriarch', element: 'tide', rarity: 'epic', cost: 6, attack: 5, health: 5, ability: 'heal', abilityValue: 4, description: 'Battlecry: Heal your hero for 4.' },
  { name: 'Stormfish', element: 'tide', rarity: 'rare', cost: 3, attack: 4, health: 2, ability: 'charge', description: 'Charge. Rides the lightning current.' },
  { name: 'Kraken Spawn', element: 'tide', rarity: 'epic', cost: 7, attack: 7, health: 6, description: 'The deep stirs.' },
  { name: 'Pearl Sage', element: 'tide', rarity: 'rare', cost: 4, attack: 3, health: 4, ability: 'heal', abilityValue: 3, description: 'Battlecry: Heal your hero for 3.' },

  // ---- Thorn ----
  { name: 'Thornling', element: 'thorn', rarity: 'common', cost: 1, attack: 1, health: 2, description: 'It grows where you least expect.' },
  { name: 'Vine Strangler', element: 'thorn', rarity: 'common', cost: 2, attack: 2, health: 3, description: 'Hugs that end careers.' },
  { name: 'Ironbark Guard', element: 'thorn', rarity: 'common', cost: 3, attack: 2, health: 5, ability: 'taunt', description: 'Taunt. Roots deeper than fear.' },
  { name: 'Venombloom', element: 'thorn', rarity: 'rare', cost: 3, attack: 2, health: 2, ability: 'poison', description: 'Poison. Beautiful and lethal.' },
  { name: 'Ancient Treant', element: 'thorn', rarity: 'epic', cost: 6, attack: 5, health: 8, ability: 'taunt', description: 'Taunt. Older than your kingdom.' },
  { name: 'Worldroot', element: 'thorn', rarity: 'legendary', cost: 9, attack: 8, health: 9, ability: 'taunt', description: 'Taunt. The world remembers.' },
  { name: 'Poison Ivy', element: 'thorn', rarity: 'rare', cost: 2, attack: 1, health: 3, ability: 'poison', description: 'Poison. Do not touch.' },
  { name: 'Wildshaper', element: 'thorn', rarity: 'epic', cost: 5, attack: 4, health: 5, ability: 'heal', abilityValue: 3, description: 'Battlecry: Heal your hero for 3.' },
  { name: 'Briar Wolf', element: 'thorn', rarity: 'common', cost: 4, attack: 4, health: 3, ability: 'charge', description: 'Charge. Packs of thorns.' },

  // ---- Shadow ----
  { name: 'Nightbat', element: 'shadow', rarity: 'common', cost: 1, attack: 2, health: 1, ability: 'charge', description: 'Charge. A scream with wings.' },
  { name: 'Shadow Wisp', element: 'shadow', rarity: 'common', cost: 2, attack: 2, health: 2, description: 'Half a thought, twice a threat.' },
  { name: 'Void Stalker', element: 'shadow', rarity: 'common', cost: 3, attack: 3, health: 3, description: 'It hunts between heartbeats.' },
  { name: 'Dread Knight', element: 'shadow', rarity: 'rare', cost: 4, attack: 4, health: 4, ability: 'taunt', description: 'Taunt. The dead keep watch.' },
  { name: 'Soul Reaver', element: 'shadow', rarity: 'epic', cost: 5, attack: 4, health: 5, ability: 'poison', description: 'Poison. It drinks what you are.' },
  { name: 'Nyx, Queen of Night', element: 'shadow', rarity: 'legendary', cost: 8, attack: 7, health: 7, ability: 'poison', description: 'Poison. The stars dim in her presence.' },
  { name: 'Cursed Blade', element: 'shadow', rarity: 'rare', cost: 3, attack: 4, health: 2, ability: 'charge', description: 'Charge. Blades don\'t forgive.' },
  { name: 'Umbra Assassin', element: 'shadow', rarity: 'epic', cost: 5, attack: 6, health: 3, ability: 'poison', description: 'Poison. You never saw it.' },
  { name: 'Grave Warden', element: 'shadow', rarity: 'common', cost: 4, attack: 3, health: 5, ability: 'taunt', description: 'Taunt. Nothing gets past the gate.' },

  // ---- Storm ----
  { name: 'Storm Sparrow', element: 'storm', rarity: 'common', cost: 1, attack: 1, health: 1, ability: 'charge', description: 'Charge. Fast as lightning, twice as loud.' },
  { name: 'Gale Drifter', element: 'storm', rarity: 'common', cost: 2, attack: 2, health: 3, description: 'Carried by winds that answer no one.' },
  { name: 'Skyraider', element: 'storm', rarity: 'common', cost: 3, attack: 3, health: 3, ability: 'charge', description: 'Charge. Strike first, apologize never.' },
  { name: 'Stormcaller', element: 'storm', rarity: 'rare', cost: 4, attack: 3, health: 5, description: 'Every storm needs a voice.' },
  { name: 'Tempest Drake', element: 'storm', rarity: 'epic', cost: 6, attack: 6, health: 5, ability: 'charge', description: 'Charge. The sky is its hunting ground.' },
  { name: 'Aether Sovereign', element: 'storm', rarity: 'legendary', cost: 8, attack: 7, health: 8, description: 'It speaks, and thunder answers.' },
  { name: 'Cloudstrider', element: 'storm', rarity: 'rare', cost: 3, attack: 3, health: 2, ability: 'charge', description: 'Charge. Leaves no footprints.' },
  { name: 'Cyclone Elemental', element: 'storm', rarity: 'epic', cost: 5, attack: 5, health: 5, description: 'The eye of the storm is calm. This is not the eye.' },
  { name: 'Frostmaw', element: 'storm', rarity: 'rare', cost: 4, attack: 4, health: 5, ability: 'taunt', description: 'Taunt. Winter made flesh.' },
];

const PACKS = [
  {
    name: 'Ember Pack',
    price: 100,
    cardCount: 5,
    dropRates: { common: 0.70, rare: 0.22, epic: 0.07, legendary: 0.01 },
    guaranteedRarity: 'rare' as const,
  },
  {
    name: 'Frost Pack',
    price: 150,
    cardCount: 5,
    dropRates: { common: 0.60, rare: 0.28, epic: 0.10, legendary: 0.02 },
    guaranteedRarity: 'rare' as const,
  },
  {
    name: 'Mythic Pack',
    price: 300,
    cardCount: 5,
    dropRates: { common: 0.45, rare: 0.35, epic: 0.15, legendary: 0.05 },
    guaranteedRarity: 'epic' as const,
  },
];

const QUESTS = [
  { type: 'win_battles', title: 'Victor of the Arena', description: 'Win 3 battles against the AI.', target: 3, rewardGold: 60, rewardXp: 40, isDaily: true },
  { type: 'play_cards', title: 'Field Commander', description: 'Play 20 cards in battles.', target: 20, rewardGold: 40, rewardXp: 25, isDaily: true },
  { type: 'open_packs', title: 'Pack Rat', description: 'Open 1 pack from the shop.', target: 1, rewardGold: 25, rewardXp: 15, isDaily: true },
  { type: 'win_battles', title: 'Weekly Warlord', description: 'Win 10 battles this week.', target: 10, rewardGold: 200, rewardXp: 150, isDaily: false },
  { type: 'play_cards', title: 'Endless Assault', description: 'Play 60 cards in battles.', target: 60, rewardGold: 120, rewardXp: 80, isDaily: false },
];

const ACHIEVEMENTS = [
  { type: 'first_win', name: 'First Blood', description: 'Win your first battle.', target: 1, rewardGold: 50, rewardXp: 30 },
  { type: 'wins_total', name: 'Decisive', description: 'Win 10 battles total.', target: 10, rewardGold: 150, rewardXp: 100 },
  { type: 'packs_opened', name: 'Pack Opener', description: 'Open 5 packs.', target: 5, rewardGold: 100, rewardXp: 60 },
  { type: 'deck_created', name: 'Deck Master', description: 'Create your first deck.', target: 1, rewardGold: 30, rewardXp: 20 },
  { type: 'level_reached', name: 'Seasoned', description: 'Reach level 10.', target: 10, rewardGold: 200, rewardXp: 0 },
  { type: 'beat_master', name: 'Master Slayer', description: 'Defeat the Master AI.', target: 1, rewardGold: 300, rewardXp: 200 },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
    @InjectRepository(Pack) private readonly packsRepo: Repository<Pack>,
    @InjectRepository(PackOpening) private readonly openingsRepo: Repository<PackOpening>,
    @InjectRepository(Deck) private readonly decksRepo: Repository<Deck>,
    @InjectRepository(Battle) private readonly battlesRepo: Repository<Battle>,
    @InjectRepository(Quest) private readonly questsRepo: Repository<Quest>,
    @InjectRepository(UserQuest) private readonly userQuestsRepo: Repository<UserQuest>,
    @InjectRepository(Achievement) private readonly achievementsRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement) private readonly userAchievementsRepo: Repository<UserAchievement>,
    private readonly aiOpponent: AiOpponentService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB !== 'true') return;
    const existing = await this.usersRepo.findOne({ where: { username: 'emberqueen' } });
    if (existing) {
      this.logger.log('Seed data already present, skipping');
      return;
    }
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding CardClash data...');

    // Cards
    for (const c of CARDS) {
      await this.cardsRepo.save(this.cardsRepo.create(c as any) as any);
    }
    const allCards = await this.cardsRepo.find();
    const cardByName = new Map(allCards.map((c) => [c.name, c]));

    // Packs
    for (const p of PACKS) {
      await this.packsRepo.save(this.packsRepo.create(p as any) as any);
    }

    // Quests
    for (const q of QUESTS) {
      await this.questsRepo.save(this.questsRepo.create(q as any) as any);
    }
    const allQuests = await this.questsRepo.find();

    // Achievements
    for (const a of ACHIEVEMENTS) {
      await this.achievementsRepo.save(this.achievementsRepo.create(a as any) as any);
    }
    const allAchievements = await this.achievementsRepo.find();

    // Demo users
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const ember = await this.usersRepo.save(this.usersRepo.create({
      email: 'ember@cardclash.app',
      username: 'emberqueen',
      passwordHash,
      xp: 1700,
      level: 18,
      gold: 1240,
      dust: 320,
      rating: 2450,
      defaultDifficulty: 'master',
    } as any)) as unknown as User;

    const frost = await this.usersRepo.save(this.usersRepo.create({
      email: 'frost@cardclash.app',
      username: 'frostfang',
      passwordHash,
      xp: 800,
      level: 9,
      gold: 500,
      dust: 120,
      rating: 1980,
      defaultDifficulty: 'veteran',
    } as any)) as unknown as User;

    // User cards for demo users (varied collections)
    const emberCollection: [string, number][] = [
      ['Cinder Imp', 3], ['Flame Sprite', 3], ['Ember Hound', 2], ['Blaze Sentinel', 2], ['Pyrelord', 1],
      ['Tidecaller', 3], ['Bubblefin', 2], ['Deepscale', 2], ['Tidal Guardian', 1], ['Stormfish', 1],
      ['Thornling', 3], ['Vine Strangler', 2], ['Ironbark Guard', 2], ['Venombloom', 1],
      ['Nightbat', 3], ['Shadow Wisp', 2], ['Void Stalker', 2], ['Dread Knight', 1],
      ['Storm Sparrow', 3], ['Gale Drifter', 2], ['Skyraider', 2], ['Stormcaller', 1],
      ['Crimson Phoenix', 1], ['Nyx, Queen of Night', 1], ['Abyssal Terror', 1], ['Aether Sovereign', 1],
    ];
    for (const [name, copies] of emberCollection) {
      const card = cardByName.get(name);
      if (!card) continue;
      await this.userCardsRepo.save(this.userCardsRepo.create({ userId: ember.id, cardId: card.id, copies } as any));
    }

    const frostCollection: [string, number][] = [
      ['Cinder Imp', 2], ['Flame Sprite', 1], ['Ember Hound', 2],
      ['Tidecaller', 3], ['Bubblefin', 3], ['Deepscale', 2], ['Tidal Guardian', 1], ['Mermaid Matriarch', 1],
      ['Thornling', 3], ['Vine Strangler', 2], ['Ironbark Guard', 2], ['Venombloom', 2],
      ['Nightbat', 2], ['Shadow Wisp', 2], ['Void Stalker', 1],
      ['Storm Sparrow', 2], ['Gale Drifter', 2], ['Skyraider', 1], ['Stormcaller', 1], ['Frostmaw', 1],
    ];
    for (const [name, copies] of frostCollection) {
      const card = cardByName.get(name);
      if (!card) continue;
      await this.userCardsRepo.save(this.userCardsRepo.create({ userId: frost.id, cardId: card.id, copies } as any));
    }

    // Decks
    const emberDeckCards = [
      'Cinder Imp', 'Cinder Imp', 'Cinder Imp', 'Flame Sprite', 'Flame Sprite', 'Flame Sprite',
      'Ember Hound', 'Ember Hound', 'Blaze Sentinel', 'Blaze Sentinel', 'Pyrelord', 'Tidecaller', 'Tidecaller', 'Tidecaller',
      'Bubblefin', 'Bubblefin', 'Deepscale', 'Thornling', 'Thornling', 'Thornling', 'Nightbat', 'Nightbat', 'Nightbat',
      'Shadow Wisp', 'Shadow Wisp', 'Storm Sparrow', 'Storm Sparrow', 'Storm Sparrow', 'Stormcaller', 'Crimson Phoenix',
    ];
    const emberDeckCardIds = emberDeckCards.map((n) => cardByName.get(n)?.id).filter(Boolean) as string[];
    const emberDeck = await this.decksRepo.save(this.decksRepo.create({
      userId: ember.id,
      name: 'Ember Rush',
      cardIds: emberDeckCardIds,
      isDefault: true,
    } as any)) as unknown as Deck;

    const frostDeckCards = [
      'Tidecaller', 'Tidecaller', 'Tidecaller', 'Bubblefin', 'Bubblefin', 'Bubblefin', 'Deepscale', 'Deepscale',
      'Tidal Guardian', 'Mermaid Matriarch', 'Thornling', 'Thornling', 'Thornling', 'Vine Strangler', 'Vine Strangler',
      'Ironbark Guard', 'Ironbark Guard', 'Venombloom', 'Venombloom', 'Nightbat', 'Nightbat', 'Shadow Wisp', 'Shadow Wisp',
      'Storm Sparrow', 'Storm Sparrow', 'Gale Drifter', 'Gale Drifter', 'Stormcaller', 'Frostmaw', 'Cinder Imp',
    ];
    const frostDeckCardIds = frostDeckCards.map((n) => cardByName.get(n)?.id).filter(Boolean) as string[];
    const frostDeck = await this.decksRepo.save(this.decksRepo.create({
      userId: frost.id,
      name: 'Tide Wall',
      cardIds: frostDeckCardIds,
      isDefault: true,
    } as any)) as unknown as Deck;

    // Battles for ember (mixed history across 3 days)
    const difficulties: ('apprentice' | 'veteran' | 'master')[] = ['apprentice', 'veteran', 'veteran', 'master', 'apprentice', 'veteran', 'master', 'veteran'];
    const results: ('win' | 'loss' | 'draw')[] = ['win', 'win', 'loss', 'win', 'win', 'loss', 'win', 'win'];
    const now = Date.now();
    const emberDeckCardObjs = emberDeckCardIds
      .map((id) => allCards.find((c) => c.id === id))
      .filter(Boolean) as Card[];
    for (let i = 0; i < 8; i++) {
      const state = createBattleState(crypto.randomUUID(), emberDeckCardObjs, []);
      state.player.heroHp = 30;
      state.enemy.heroHp = results[i] === 'win' ? 0 : 30;
      state.phase = results[i] === 'win' ? 'victory' : 'defeat';
      await this.battlesRepo.save(this.battlesRepo.create({
        userId: ember.id,
        deckId: emberDeck.id,
        difficulty: difficulties[i],
        result: results[i],
        turns: 6 + i,
        xpEarned: results[i] === 'win' ? 45 : 10,
        goldEarned: results[i] === 'win' ? 30 : 5,
        ratingDelta: results[i] === 'win' ? 12 : -8,
        state,
        createdAt: new Date(now - (i + 1) * 86400000 * 1.4),
        completedAt: new Date(now - (i + 1) * 86400000 * 1.4),
      } as any));
    }

    // Quests progress for ember (one claimable)
    const today = new Date().toISOString().slice(0, 10);
    const questProgress: [string, number][] = [
      ['Victor of the Arena', 2],
      ['Field Commander', 20],
      ['Pack Rat', 1],
    ];
    for (const [title, progress] of questProgress) {
      const quest = allQuests.find((q) => q.title === title);
      if (!quest) continue;
      await this.userQuestsRepo.save(this.userQuestsRepo.create({
        userId: ember.id,
        questId: quest.id,
        questDate: today,
        progress,
        isCompleted: progress >= quest.target,
      } as any));
    }

    // Achievements for ember (some unlocked, some claimed)
    const emberAchievements: [string, boolean][] = [
      ['First Blood', true],
      ['Decisive', false],
      ['Pack Opener', false],
      ['Deck Master', true],
      ['Seasoned', false],
    ];
    for (const [name, claimed] of emberAchievements) {
      const achievement = allAchievements.find((a) => a.name === name);
      if (!achievement) continue;
      await this.userAchievementsRepo.save(this.userAchievementsRepo.create({
        userId: ember.id,
        achievementId: achievement.id,
        claimedAt: claimed ? new Date() : null,
      } as any));
    }

    // Pack openings for ember (for pack quest + achievement progress)
    const emberPack = await this.packsRepo.findOne({ where: { name: 'Ember Pack' } });
    if (emberPack) {
      const pulled = [cardByName.get('Cinder Imp')!, cardByName.get('Tidecaller')!, cardByName.get('Thornling')!, cardByName.get('Nightbat')!, cardByName.get('Blaze Sentinel')!];
      await this.openingsRepo.save(this.openingsRepo.create({
        userId: ember.id,
        packId: emberPack.id,
        pulledCardIds: pulled.map((c) => c.id),
        dustGained: 0,
      } as any));
    }

    void frostDeck;
    this.logger.log('Seed complete: 45 cards, 3 packs, 5 quests, 6 achievements, 2 demo users');
  }
}
