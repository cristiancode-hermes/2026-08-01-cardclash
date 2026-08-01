# CardClash — Architecture

**CardClash** is a full-stack collectible card battle game: open packs, build decks, and battle AI opponents on a deterministic turn-based engine. Built 2026-08-01 from the design specs at `/opt/data/hermes-design-specs/2026-08-01-cardclash/`.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 22 (standalone components, signals, zoneless) |
| Backend | NestJS 11, TypeORM, better-sqlite3 |
| Auth | JWT (passport-jwt), bcryptjs |
| Tests | Jest + ts-jest (49 unit tests) |
| Tooling | npm workspaces monorepo, pure-CSS design tokens (no Tailwind) |

## Monorepo layout

```
2026-08-01-cardclash/
├── package.json            # npm workspaces: apps/*
├── apps/
│   ├── api/                # NestJS API (port 3000)
│   │   └── src/
│   │       ├── main.ts     # bootstrap + global ValidationPipe + Swagger
│   │       ├── app.module.ts
│   │       ├── entities/   # 11 TypeORM entities + barrel
│   │       ├── auth/       # register/login/profile/password + JWT strategy
│   │       ├── cards/      # catalog + collection endpoints
│   │       ├── packs/      # pack shop + atomic pack opening (odds)
│   │       ├── decks/      # deck CRUD + validation (15-30 cards, 3-copy limit)
│   │       ├── battles/    # battle engine + AI opponent + battle lifecycle
│   │       ├── leaderboard/  # top-100 ladder by rating
│   │       ├── quests/     # daily quests with progress tracking
│   │       ├── achievements/ # unlockable achievements with claimable rewards
│   │       └── seed/       # 45 cards, 3 packs, 5 quests, 6 achievements, 2 demo users
│   └── web/                # Angular SPA
│       └── src/app/
│           ├── layout/     # navbar shell + player badges
│           ├── pages/      # 13 lazy routes
│           ├── shared/     # playing-card, element-pill, rarity-badge, progress-bar, empty-state, confirm-dialog
│           ├── services/   # typed API clients
│           ├── guards/     # auth guard
│           └── interceptors/ # Bearer token interceptor
└── docs/                   # this documentation
```

## Domain model (11 entities)

- **User** — profile, currencies (gold/dust), XP/level, Elo rating, default difficulty
- **Card** — catalog entry: element, rarity, cost/attack/health, ability (taunt/charge/poison/heal)
- **UserCard** — owned copies (`@Unique(userId, cardId)`, max 3 copies per card)
- **Pack** — shop item with `DropRates` (weighted rarity odds) + guaranteed rarity
- **PackOpening** — history of openings, pulled cards, dust gained
- **Deck** — card list (15–30), `isDefault` flag
- **Battle** — persisted battle record: difficulty, result, turns, rewards, rating delta, JSON state
- **Quest** — quest template (type, target, rewards, isDaily)
- **UserQuest** — per-user daily progress (`@Unique(userId, questId, questDate)`)
- **Achievement** — achievement template (type, target, rewards)
- **UserAchievement** — unlock/claim state (`@Unique(userId, achievementId)`)

## Key design decisions

1. **Deterministic battle engine** (`battles/battle-engine.ts`, 286 lines). Pure functions over a `BattleState` object: `playCard`, `attack`, `endPlayerTurn`, `checkGameEnd`. Same state + same action = same outcome → trivially testable. Battle states are serialized as JSON in the `Battle` entity.
2. **AI opponent** (`ai-opponent.service.ts`) with 3 difficulties: apprentice (random), veteran (plays most expensive card, attacks weakest minion), master (adds taunt preference). All attacks respect taunt blocking via `getValidAttackTargets`.
3. **Atomic pack opening** — the open runs inside a `DataSource.transaction` with a pessimistic user row lock: deduct gold, roll rarities, grant cards (or convert duplicates beyond 3 copies to dust) in one shot.
4. **Elo rating** — K=32 Elo delta on battle completion, driving the leaderboard.
5. **Starter rewards** — registration grants starter gold, a starter collection, and a free pack (best-effort, outside the registration transaction).
6. **Seed data** — 45 cards (9 per element × 5 elements), 3 packs (Ember/Frost/Mythic with escalating odds), 5 quests (3 daily + 2 weekly), 6 achievements, 2 demo users with realistic collections/decks/battle history.

## Seed demo users

| Username | Password | Level | Rating | Notes |
|----------|----------|-------|--------|-------|
| `emberqueen` | `demo1234` | 18 | 2450 | Rich collection incl. legendaries, default deck "Ember Rush", 8 battles, claimable quest |
| `frostfang` | `demo1234` | 9 | 1980 | Mid collection, default deck "Tide Wall" |

Seed runs when `SEED_DB=true` env var is set (guarded idempotently).

## Environment

- `JWT_SECRET` — signing secret for auth tokens
- `PORT` — API port (default 3000)
- `SEED_DB=true` — seed demo data on boot
