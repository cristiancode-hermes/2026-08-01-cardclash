import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DecksService } from '../../services/decks.service';
import { BattlesService } from '../../services/battles.service';
import type { Deck, Difficulty } from '../../models/models';

@Component({
  selector: 'app-battle-setup',
  standalone: true,
  template: `
    <div class="container page" style="max-width: 760px;">
      <div class="page-header">
        <div>
          <h1>Battle Setup</h1>
          <p class="subtitle">Choose your deck and challenge the arena AI.</p>
        </div>
      </div>

      <section class="card" style="margin-bottom: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-md);">1 · Choose your deck</h2>
        @if (decks().length === 0) {
          <p class="muted">You need a deck with at least 15 cards. <a routerLink="/decks">Build one →</a></p>
        } @else {
          <div class="deck-options">
            @for (deck of decks(); track deck.id) {
              <button class="deck-option" [class.selected]="selectedDeckId() === deck.id" (click)="selectedDeckId.set(deck.id)">
                <span class="do-name">{{ deck.name }}</span>
                <span class="mono muted">{{ deck.cardIds.length }}/30</span>
              </button>
            }
          </div>
        }
      </section>

      <section class="card" style="margin-bottom: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-md);">2 · Pick a difficulty</h2>
        <div class="diff-options">
          @for (d of difficulties; track d.id) {
            <button class="diff-option" [class.selected]="difficulty() === d.id" (click)="difficulty.set(d.id)">
              <span class="do-icon">{{ d.icon }}</span>
              <span class="do-title">{{ d.label }}</span>
              <span class="do-sub">{{ d.desc }}</span>
              <span class="do-reward">{{ d.reward }}</span>
            </button>
          }
        </div>
      </section>

      @if (error()) {
        <div class="alert alert-danger" role="alert">{{ error() }}</div>
      }

      <button class="btn btn-primary btn-block btn-lg" [disabled]="!selectedDeckId() || starting()" (click)="start()">
        {{ starting() ? 'Entering arena…' : '⚔ Start battle' }}
      </button>
    </div>
  `,
  styles: [`
    .deck-options, .diff-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-md);
    }
    .deck-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.938rem;
      font-weight: 600;
      color: var(--color-text);
      transition: border-color var(--duration-fast) var(--ease-out);
    }
    .deck-option:hover { border-color: var(--color-primary); }
    .deck-option.selected { border-color: var(--color-primary); background: rgba(29, 78, 216, 0.06); }
    .diff-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: var(--space-lg);
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--color-text);
      text-align: left;
      transition: border-color var(--duration-fast) var(--ease-out);
    }
    .diff-option:hover { border-color: var(--color-primary); }
    .diff-option.selected { border-color: var(--color-accent); background: rgba(217, 119, 6, 0.06); }
    .do-icon { font-size: 1.5rem; }
    .do-title { font-weight: 700; font-size: 1rem; }
    .do-sub { font-size: 0.75rem; color: var(--color-text-muted); }
    .do-reward { font-family: var(--font-mono); font-size: 0.688rem; color: var(--color-accent); }
    .btn-lg { padding: var(--space-md) var(--space-xl); font-size: 1rem; }
  `]
})
export class BattleSetupPage {
  private decksService = inject(DecksService);
  private battlesService = inject(BattlesService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly decks = signal<Deck[]>([]);
  readonly selectedDeckId = signal<string | null>(null);
  readonly difficulty = signal<Difficulty>('apprentice');
  readonly starting = signal(false);
  readonly error = signal('');

  readonly difficulties = [
    { id: 'apprentice' as const, icon: '🟢', label: 'Apprentice', desc: 'A gentle warm-up. Small rewards.', reward: '+45 XP · +30 gold' },
    { id: 'veteran' as const, icon: '🟠', label: 'Veteran', desc: 'A seasoned duelist. Fair fight.', reward: '+45 XP · +30 gold' },
    { id: 'master' as const, icon: '🔴', label: 'Master', desc: 'Relentless. Bring your best deck.', reward: '+45 XP · +30 gold' },
  ];

  constructor() {
    this.load();
  }

  private async load() {
    const user = this.auth.currentUser();
    this.difficulty.set(user?.defaultDifficulty ?? 'apprentice');
    const decks = await this.decksService.getAll();
    const playable = decks.filter((d) => d.cardIds.length >= 15);
    this.decks.set(playable);
    const defaultDeck = user?.defaultDeckId
      ? playable.find((d) => d.id === user.defaultDeckId)
      : playable.find((d) => d.isDefault);
    this.selectedDeckId.set(defaultDeck?.id ?? playable[0]?.id ?? null);
  }

  async start() {
    const deckId = this.selectedDeckId();
    if (!deckId || this.starting()) return;
    this.starting.set(true);
    this.error.set('');
    try {
      const state = await this.battlesService.start(this.difficulty(), deckId);
      this.router.navigate(['/battle', state.battleId]);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not start the battle');
      this.starting.set(false);
    }
  }
}
