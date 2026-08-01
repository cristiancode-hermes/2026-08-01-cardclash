# CardClash — API Reference

Base URL: `/api` · Auth: `Authorization: Bearer <token>` (all routes except register/login)

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ email, username, password }` | `{ token, user }` — grants starter gold + collection + free pack |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | — | `User` |
| PATCH | `/api/auth/profile` | `{ username?, avatarUrl?, defaultDifficulty? }` | `User` |
| PATCH | `/api/auth/password` | `{ currentPassword, newPassword }` | `{ message }` |

## Cards

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/cards` | `Card[]` — full catalog |
| GET | `/api/cards/:id` | `Card` |
| GET | `/api/cards/collection` | `CollectionItem[]` — `{ card, copies }` for the current user |

## Packs

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/packs` | — | `Pack[]` — active packs by price |
| POST | `/api/packs/:id/open` | — | `{ pulled: Card[], dustGained, opening }` — atomic |

## Decks

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/decks` | — | `Deck[]` |
| GET | `/api/decks/:id` | — | `Deck` |
| POST | `/api/decks` | `{ name, cardIds }` | `Deck` — validated (15–30 cards, ≤3 copies, ownership) |
| PATCH | `/api/decks/:id` | `{ name?, cardIds? }` | `Deck` |
| DELETE | `/api/decks/:id` | — | `{ message }` |

## Battles

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/battles` | `{ difficulty: 'apprentice'\|'veteran'\|'master', deckId }` | `BattleState` |
| GET | `/api/battles/:id` | — | `BattleState` — resume |
| POST | `/api/battles/:id/play` | `{ cardId }` | `BattleState` |
| POST | `/api/battles/:id/attack` | `{ attackerId, targetId }` (`targetId` = minion `instanceId` or `'hero'`) | `BattleState` |
| POST | `/api/battles/:id/end-turn` | — | `BattleState` — AI resolves, next player turn |
| GET | `/api/battles/history` | — | `{ battles: BattleSummary[], summary: { wins, losses, draws } }` |

Rewards: victory → 45 XP + 30 gold + Elo delta; defeat → 10 XP + 5 gold; draw → 20 XP + 15 gold.

## Leaderboard

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/leaderboard` | `{ rows: LeaderboardRow[], myRank: number \| null }` — top 100 by rating |

## Quests

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/quests` | — | `UserQuestView[]` — today's quests with progress |
| POST | `/api/quests/:id/claim` | — | `{ rewards: { gold, xp }, user }` — atomic |

Quest types: `win_battles`, `play_cards`, `open_packs`.

## Achievements

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/achievements` | — | `AchievementView[]` — all with unlock/claim state |
| POST | `/api/achievements/:id/claim` | — | `{ rewards: { gold, xp }, user }` |

## Battle engine protocol

BattleState:

```
{ battleId, phase: 'player'|'enemy'|'victory'|'defeat'|'draw', turn,
  player: { heroHp, heroMaxHp, mana, manaMax, hand: Card[], board: Minion[], deck: Card[] },
  enemy:  { heroHp, heroMaxHp, mana, manaMax, hand: Card[], board: Minion[], deck: Card[] },
  log: BattleEvent[] }
```

Rules: heroes 30 HP; turn 1 draws 3 cards, mana 1 (+1/turn, max 10); play card if cost ≤ mana and board < 5; charge minions attack immediately; taunt forces targeting; poison destroys defenders without retaliation; hero at ≤0 HP ends the game; turn 40 = draw.
