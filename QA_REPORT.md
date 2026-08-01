# QA Report — 2026-08-01 CardClash

**Project:** Collectible Card Battle Game — open packs, build decks, battle AI, climb Elo leaderboard
**Stack:** Angular 22 + NestJS 11 + TypeScript 6.0.3 + better-sqlite3 + bcryptjs
**Author:** Hermes Daily Builder

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API (`tsc -p tsconfig.build.json`) | ✅ PASS | Exit 0, `dist/main.js` emitted (stale `.tsbuildinfo` deleted first) |
| Web (`ng build`) | ✅ PASS | `dist/cardclash-web/browser/` — 2 warnings only (unused EmptyState import; CSS budget 4.41kB vs 4.00kB) |
| AppModule imports | ✅ PASS | TypeOrmModule.forRoot + Auth/Cards/Packs/Decks/Battles/Leaderboard/Quests/Achievements/Seed |
| reflect-metadata | ✅ PASS | Present in main.ts |
| TypeScript version | ✅ PASS | 6.0.3 (Angular 22 requires >=6.0.0) |
| Zone.js | ✅ PASS | App uses `provideZonelessChangeDetection()` — no zone.js needed (NG0908 N/A) |

## ✅ 2. Test Results

49 test cases · 49 assertions — ALL PASSED (5 suites: battle-engine, ai-opponent, decks, packs, quests)

| Test Suite | Test Case | Assertions |
|------------|-----------|------------|
| battle-engine.spec | engine rules (mana, taunt, abilities, game end) | PASS |
| ai-opponent.service.spec | AI turn logic | PASS |
| decks.service.spec | deck validation, ownership, copy limits | PASS |
| packs.service.spec | pack opening, gold checks | PASS (1 spec updated to match setLock removal) |
| quests.service.spec | quest progress/claim | PASS |

No web unit tests (spec files absent — coverage via API tests + browser verification).

## ✅ 3. Runtime / API Verification

| Endpoint | Result | Details |
|----------|--------|---------|
| POST /api/auth/register | ✅ 201 | Returns `{token, user}` |
| POST /api/auth/login | ✅ 201 | demo (ember@cardclash.app/demo1234) works |
| GET /api/auth/me | ✅ 200 | JWT guard correct |
| GET /api/cards | ✅ 200 | 45 seeded cards |
| GET /api/cards/collection | ✅ 200 | 26 owned cards for demo user |
| POST /api/packs/:id/open | ✅ 200 | Pulls cards, deducts gold |
| POST /api/decks | ✅ 201 | 15-30 cards, ownership + max-copy validation |
| POST /api/battles | ✅ 201 | Battle created with deck + difficulty |
| POST /api/battles/:id/play | ✅ 200 | Card to board, mana deducted |
| POST /api/battles/:id/attack | ✅ 200 | Taunt blocking verified (correct game logic) |
| POST /api/battles/:id/end-turn | ✅ 200 | Turn advances, AI plays |
| GET /api/battles/history | ✅ 200 | History + summary (wins/losses) |
| GET /api/leaderboard | ✅ 200 | Elo ranking with win/loss stats |
| GET /api/quests | ✅ 200 | 5 seeded quests with progress |
| GET /api/achievements | ✅ 200 | 6 achievements |
| GET /docs-json | ✅ 200 | Swagger at /docs |

Full battle flow completed end-to-end: battle → loss in 7 turns, +10 XP, +5 gold, -32 rating persisted.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Auth flow | ✅ | register/login public, /me guarded, token key `cardclash_token` consistent FE↔BE |
| Auth interceptor | ✅ | `'Bearer '.concat(token)` — no malformed template literal (`***` grep clean project-wide) |
| API base URL | ✅ | Relative `/api` — correct for Caddy reverse proxy |
| Response shapes | ✅ | `{token, user}` consumed correctly by frontend |
| Controllers | ✅ | No `api/` prefix duplication; global prefix `api` only |
| APP_GUARD | ✅ | Not used — per-controller `@UseGuards(JwtAuthGuard)` |
| Seed data | ✅ | 45 cards / 3 packs / 5 quests / 6 achievements / 2 demo users |
| Seed field names | ✅ | `passwordHash` column + seed shorthand consistent |
| Reserved-word aliases | ✅ | No raw SQL reserved-word aliases |

### Fixed During QA (4 bugs → all resolved)
| Issue | Severity | Fix |
|-------|----------|-----|
| `Data type "Object" in User.avatarUrl` — nullable union columns without explicit type | CRITICAL | Added `type: 'varchar'` to `avatarUrl`, `guaranteedRarity`, `result` columns |
| `no such column: user_id` in achievements raw SQL | CRITICAL | Quoted camelCase `"userId"` in 3 count queries |
| Leaderboard `RangeError: Too few parameter values` — `{ $not: null }` invalid FindOperator | CRITICAL | Replaced with `Not(IsNull())` (imported from typeorm) |
| `LockNotSupportedOnGivenDriverError` — `setLock('pessimistic_write')` on better-sqlite3 | CRITICAL | Removed lock; transaction serialization is sufficient |

### Minor Issues
| Issue | Severity | Suggestion |
|-------|----------|------------|
| Unused `EmptyState` import in ShopPage | Minor | Remove import |
| battle-arena CSS over 4kB budget by 411B | Minor | Extract inline styles to global css |
| No web-side unit tests | Minor | Add component/guard specs |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| Hardcoded secrets in source | ✅ None found |
| bcrypt password hashing | ✅ bcryptjs with 10 rounds |
| JWT auth on protected routes | ✅ |
| No `eval`/`exec`/shell injection | ✅ |
| No `***` placeholder artifacts | ✅ |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| GitHub repo | ✅ | cristiancode-hermes/2026-08-01-cardclash (main pushed) |
| API | ✅ | Port 3053, SEED_DB=true, registered in manage-apis.sh (survives restart) |
| Caddy subdomain | ✅ | cardclash.proyectos.cristiancode.dev → 200 (web + /api proxy) |
| Landing page | ✅ | Added to `core` category, pushed, live (grep count = 1) |
| Portfolio (es/en/pt) | ✅ | Entry id 135, theme_duelist, pushed, tsc clean |
| Capture config | ✅ | config.mjs + prod-capture.mjs registered, node --check OK |
| Excel tracker | ✅ | Row 68 added |

## Summary

**OVERALL: PASS ✅** — 49/49 tests green, full auth + battle gameplay verified end-to-end, 4 critical runtime bugs found and fixed during QA, deployed to production subdomain with all portfolio links verified.

**⚠️ Link verification (required pre-close):** href/subdomain 200 ✅, link2 README 200 ✅, link3 repo 200 ✅ — all verified with curl before marking complete.
