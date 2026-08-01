# CardClash — Frontend

Angular 22 SPA, standalone components, signals, zoneless change detection. Design system: **Emberfrost** (see spec `DESIGN_SYSTEM.md`).

## Routes (all lazy-loaded)

| Path | Component | Auth |
|------|-----------|------|
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/collection` | CollectionPage | Yes |
| `/decks` | DeckListPage | Yes |
| `/decks/:deckId` | DeckBuilderPage | Yes |
| `/battle` | BattleSetupPage | Yes |
| `/battle/:battleId` | BattleArenaPage | Yes |
| `/history` | HistoryPage | Yes |
| `/shop` | ShopPage | Yes |
| `/leaderboard` | LeaderboardPage | Yes |
| `/quests` | QuestsPage | Yes |
| `/settings` | SettingsPage | Yes |

Protected routes sit under `LayoutShell` (navbar) with `authGuard`; unauthenticated users are redirected to `/login`.

## Services

- `AuthService` — token in `localStorage['cardclash_token']`, current-user signal, profile/password updates
- `CardsService` — catalog + collection
- `PacksService` — pack listing + opening
- `DecksService` — CRUD
- `BattlesService` — start/play/attack/end-turn/history
- `LeaderboardService` — ladder
- `QuestsService` / `AchievementsService` — daily quests + achievements with claims
- `ThemeService` — light/dark (`data-theme` on `<html>`, `cardclash_theme` key)

`authInterceptor` attaches the Bearer token to every request.

## Shared components

| Component | Purpose |
|-----------|---------|
| `PlayingCard` | THE core card: rarity frame, element header, mono cost/attack/health, hover lift, selected/disabled states |
| `PlayerBadges` | Level / gold / dust / rating pills in the navbar |
| `ElementPill` | Element chip with colored dot |
| `RarityBadge` | Rarity chip (common→legendary) |
| `ProgressBar` | Quest / XP progress |
| `EmptyState` | Icon + title + CTA |
| `ConfirmDialog` | Delete confirmations |

## Design tokens

Pure CSS variables in `styles.css` — no Tailwind:

- **Light**: frost-blue battlefield (`#EEF1F6` bg, white surfaces, battle-blue primary `#1D4ED8`, ember `#DC2626`, gold accent `#D97706`)
- **Dark**: midnight battlefield (`#0F172A` bg, `#1E293B` surfaces, ice-blue primary `#60A5FA`)
- **Elements**: ember `#EF4444`, tide `#3B82F6`, thorn `#22C55E`, shadow `#8B5CF6`, storm `#06B6D4`
- **Rarity**: common `#94A3B8`, rare `#3B82F6`, epic `#8B5CF6`, legendary `#F59E0B` (+glow shadows)
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (stats)
- Motion: `--ease-out` expo curve, `prefers-reduced-motion` kill-switch

## Key interactions

- **Collection**: filter by element/rarity, owned-only toggle, detail modal
- **Deck builder**: click-to-add from owned pool, click-to-remove, live mana curve, validation (15–30 cards), copy limits enforced
- **Battle arena**: click hand card to play, click your READY minion then enemy minion/hero to attack, end turn triggers the AI; result overlay on victory/defeat/draw; battle log stream
- **Shop**: pack cards with odds, sequential flip reveal (120ms stagger), highest-rarity pulse
- **Quests**: claimable completed quests/achievements, rewards refresh the user signal

## Build

```bash
cd apps/web
node ../../node_modules/@angular/cli/bin/ng.js build   # → dist/cardclash-web
```

The dev proxy expects the API on the same origin under `/api` (port 3000).
