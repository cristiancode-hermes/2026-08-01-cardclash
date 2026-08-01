import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserCard, Card, Deck, Pack, PackOpening } from '../entities/entities';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

const STARTER_CARD_NAMES = [
  'Cinder Imp', 'Cinder Imp', 'Ember Hound', 'Ember Hound', 'Flame Sprite', 'Flame Sprite',
  'Tidecaller', 'Tidecaller', 'Bubblefin', 'Bubblefin',
  'Thornling', 'Thornling', 'Vine Strangler', 'Vine Strangler',
  'Nightbat', 'Nightbat', 'Shadow Wisp', 'Shadow Wisp',
  'Storm Sparrow', 'Storm Sparrow', 'Gale Drifter', 'Gale Drifter',
  'Blaze Sentinel', 'Blaze Sentinel', 'Deepscale', 'Deepscale',
  'Ironbark Guard', 'Ironbark Guard', 'Void Stalker', 'Void Stalker',
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(Deck) private readonly decksRepo: Repository<Deck>,
    @InjectRepository(Pack) private readonly packsRepo: Repository<Pack>,
    @InjectRepository(PackOpening) private readonly openingsRepo: Repository<PackOpening>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }
    const existingUsername = await this.usersRepo.findOne({ where: { username: dto.username } });
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    } as any);

    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(User, user) as unknown as User;
      await this.grantStarterCollection(manager, created.id);
      await this.createStarterDeck(manager, created.id);
      return created;
    });

    // Grant a free pack opening (outside the registration transaction, best-effort)
    let freePack: Awaited<ReturnType<typeof this.openFreePack>> = null;
    try {
      freePack = await this.openFreePack(saved.id);
    } catch (err) {
      this.logger.warn(`Free pack grant failed for ${saved.email}: ${(err as Error).message}`);
    }

    const base = this.buildAuthResponse(saved);
    return { ...base, freePack };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (dto.username !== undefined && dto.username !== user.username) {
      const taken = await this.usersRepo.findOne({ where: { username: dto.username } });
      if (taken) throw new ConflictException('Username is already taken');
      user.username = dto.username;
    }
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl || null;
    if (dto.defaultDifficulty !== undefined) user.defaultDifficulty = dto.defaultDifficulty;
    if (dto.defaultDeckId !== undefined) user.defaultDeckId = dto.defaultDeckId;

    const saved = await this.usersRepo.save(user) as unknown as User;
    return this.sanitize(saved);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);
    return { message: 'Password updated successfully' };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id: userId } });
  }

  private async grantStarterCollection(manager: any, userId: string) {
    const cards = await manager.find(Card) as Card[];
    const byName = new Map(cards.map((c: Card) => [c.name, c]));
    const counts = new Map<string, number>();
    for (const name of STARTER_CARD_NAMES) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const [name, copies] of counts) {
      const card = byName.get(name);
      if (!card) continue;
      await manager.save(UserCard, manager.create(UserCard, { userId, cardId: card.id, copies } as any));
    }
  }

  private async createStarterDeck(manager: any, userId: string) {
    const cards = await manager.find(Card) as Card[];
    const byName = new Map(cards.map((c: Card) => [c.name, c]));
    const counts = new Map<string, number>();
    for (const name of STARTER_CARD_NAMES) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const cardIds: string[] = [];
    for (const [name, copies] of counts) {
      const card = byName.get(name);
      if (!card) continue;
      for (let i = 0; i < copies; i++) cardIds.push(card.id);
    }
    if (cardIds.length >= 15) {
      await manager.save(Deck, manager.create(Deck, {
        userId,
        name: 'Starter',
        cardIds: cardIds.slice(0, 30),
        isDefault: true,
      } as any));
    }
  }

  private async openFreePack(userId: string) {
    const pack = await this.packsRepo.findOne({ where: { name: 'Ember Pack' } });
    if (!pack) return null;
    const cards = await this.cardsRepo.find();
    const pulled: Card[] = [];
    let dustGained = 0;

    for (let i = 0; i < pack.cardCount; i++) {
      const rarity = this.rollRarity(pack.dropRates);
      const pool = cards.filter((c) => c.rarity === rarity);
      if (pool.length === 0) continue;
      const card = pool[Math.floor(Math.random() * pool.length)];
      pulled.push(card);
    }

    // Grant copies (free pack is not gold-costed; duplicates still grant dust)
    const dupes = new Map<string, { card: Card; extra: number }>();
    for (const card of pulled) {
      const existing = await this.userCardsRepo.findOne({ where: { userId, cardId: card.id } });
      const current = existing?.copies ?? 0;
      const newCopies = Math.min(current + 1, 3);
      if (existing) {
        existing.copies = newCopies;
        await this.userCardsRepo.save(existing);
      } else {
        await this.userCardsRepo.save(this.userCardsRepo.create({ userId, cardId: card.id, copies: 1 } as any));
      }
      if (current + 1 > 3) {
        const extra = current + 1 - 3;
        dupes.set(card.id, { card, extra });
      }
    }
    for (const { card, extra } of dupes.values()) {
      dustGained += extra * this.dustValue(card.rarity);
    }
    if (dustGained > 0) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (user) {
        user.dust = (user.dust ?? 0) + dustGained;
        await this.usersRepo.save(user);
      }
    }
    const opening = await this.openingsRepo.save(this.openingsRepo.create({
      userId,
      packId: pack.id,
      pulledCardIds: pulled.map((c) => c.id),
      dustGained,
    } as any)) as unknown as PackOpening;

    return { pulled, dustGained, opening };
  }

  private rollRarity(dropRates: { common: number; rare: number; epic: number; legendary: number }) {
    const r = Math.random();
    let acc = 0;
    for (const [rarity, weight] of Object.entries(dropRates)) {
      acc += weight;
      if (r <= acc) return rarity;
    }
    return 'common';
  }

  private dustValue(rarity: string): number {
    switch (rarity) {
      case 'common': return 5;
      case 'rare': return 20;
      case 'epic': return 100;
      case 'legendary': return 400;
      default: return 5;
    }
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      token: this.jwtService.sign(payload),
      user: this.sanitize(user),
    };
  }

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
