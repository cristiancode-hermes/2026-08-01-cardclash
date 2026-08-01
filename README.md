# CardClash — Collectible Card Battle Game

Juego de batallas de cartas coleccionables construido con **Angular 22** y **NestJS 11**. Colecciona cartas de 5 elementos, construye mazos, abre sobres y asciende en el ranking Elo contra oponentes IA.

**Live:** https://cardclash.proyectos.cristiancode.dev

## 🎴 Características

- **45 cartas únicas** en 5 elementos (ember, tide, thorn, shadow, storm) con rarezas (common → legendary) y habilidades (Taunt, Charge, Poison, Heal)
- **Sobres**: economía de oro y polvo, probabilidades por rareza, cartas duplicadas convertidas en polvo
- **Mazos**: 15–30 cartas con validación de propiedad y límite de 3 copias por carta
- **Combate por turnos** contra IA (3 dificultades): mana por turno, tablero, habilidades, curaciones y veneno
- **Ranking Elo** con clasificación global, historial de batallas y estadísticas
- **Misiones diarias y semanales** con recompensas canjeables
- **Logros** desbloqueables con recompensas de oro/XP
- Autenticación JWT, tema claro/oscuro, datos semilla precargados, totalmente responsive

## 🛠 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 22 (zoneless, standalone components, signals) |
| Backend | NestJS 11 + TypeORM |
| Base de datos | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |

## 🚀 Ejecución local

```bash
npm install

# API (puerto 3000 por defecto)
cd apps/api && SEED_DB=true npm run start:dev

# Web
cd apps/web && npm start
```

Demo: `ember@cardclash.app` / `demo1234` (o `frost@cardclash.app` / `demo1234`)

## 📁 Estructura

```
apps/
  api/    NestJS: auth, cards, packs, decks, battles, leaderboard, quests, achievements, seed
  web/    Angular: dashboard, collection, deck-builder, battle-arena, shop, leaderboard, quests
docs/     API.md, ARCHITECTURE.md, FRONTEND.md
```

## 🧪 Tests

```bash
cd apps/api && npx jest   # 49 tests — battle engine, AI, decks, packs, quests
```

## 📄 Documentación

- [API](docs/API.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Frontend](docs/FRONTEND.md)
