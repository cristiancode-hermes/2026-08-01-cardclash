import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CardsService } from '../../services/cards.service';
import { BattlesService } from '../../services/battles.service';
import { QuestsService } from '../../services/quests.service';
import type { UserQuestView, CollectionItem } from '../../models/models';
import { ProgressBar } from '../../shared/progress-bar/progress-bar';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ElementPill } from '../../shared/element-pill/element-pill';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ProgressBar, EmptyState, ElementPill],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Welcome back{{ auth.currentUser() ? ', ' + auth.currentUser()!.username : '' }}</h1>
          <p class="subtitle">Your quest log and quick actions await.</p>
        </div>
        <div class="flex gap-sm">
          <a routerLink="/battle" class="btn btn-primary">⚔ Battle now</a>
          <a routerLink="/shop" class="btn btn-accent">🃏 Open packs</a>
        </div>
      </div>

      <!-- Stat row -->
      @if (auth.currentUser(); as user) {
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: var(--space-2xl);">
          <div class="stat-card">
            <div class="stat-value">{{ user.level }}</div>
            <div class="stat-label">Level</div>
            <app-progress-bar [value]="user.xp % 100" [max]="100" style="display:block; margin-top: 8px;" />
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: var(--color-accent);">🪙 {{ user.gold }}</div>
            <div class="stat-label">Gold</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #8B5CF6;">✨ {{ user.dust }}</div>
            <div class="stat-label">Dust</div>
          </div>
          <div class="stat-card">
            <div class="stat-value mono">{{ user.rating }}</div>
            <div class="stat-label">Rating</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ collection().length }}</div>
            <div class="stat-label">Unique cards</div>
          </div>
        </div>
      }

      <div class="grid two-col">
        <!-- Daily quests -->
        <section class="card">
          <div class="flex-between" style="margin-bottom: var(--space-md);">
            <h2>Daily quests</h2>
            <a routerLink="/quests" class="btn btn-ghost btn-sm">All quests →</a>
          </div>
          @if (quests().length === 0) {
            <app-empty-state icon="📜" title="Loading quests…" />
          } @else {
            <div class="quest-mini-list">
              @for (q of quests().slice(0, 3); track q.questId) {
                <div class="quest-mini">
                  <div class="quest-mini-info">
                    <div class="quest-mini-title">{{ q.title }}</div>
                    <app-progress-bar [value]="q.progress" [max]="q.target" />
                  </div>
                  <span class="mono muted" style="font-size: 0.75rem;">{{ q.progress }}/{{ q.target }}</span>
                </div>
              }
            </div>
          }
        </section>

        <!-- Quick actions -->
        <section class="card">
          <h2 style="margin-bottom: var(--space-md);">Arena</h2>
          <div class="quick-actions">
            <a routerLink="/battle" class="quick-action">
              <span class="qa-icon">⚔</span>
              <span class="qa-title">Battle the AI</span>
              <span class="qa-sub">3 difficulties, Elo rating</span>
            </a>
            <a routerLink="/decks" class="quick-action">
              <span class="qa-icon">🂠</span>
              <span class="qa-title">Build a deck</span>
              <span class="qa-sub">15–30 cards, validated</span>
            </a>
            <a routerLink="/history" class="quick-action">
              <span class="qa-icon">📜</span>
              <span class="qa-title">Battle history</span>
              <span class="qa-sub">Last 20 duels</span>
            </a>
            <a routerLink="/leaderboard" class="quick-action">
              <span class="qa-icon">🏆</span>
              <span class="qa-title">Leaderboard</span>
              <span class="qa-sub">Top duelists by rating</span>
            </a>
          </div>
        </section>
      </div>

      <!-- Element breakdown -->
      <section class="card" style="margin-top: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-md);">Your collection by element</h2>
        <div class="flex gap-md" style="flex-wrap: wrap;">
          @for (e of elementStats(); track e.name) {
            <div class="element-stat">
              <app-element-pill [element]="e.name" />
              <span class="mono" style="margin-left: var(--space-sm);">{{ e.count }}</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .two-col {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
    }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
    .quest-mini-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .quest-mini {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    .quest-mini-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .quest-mini-title { font-size: 0.875rem; font-weight: 600; }
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md);
    }
    @media (max-width: 600px) { .quick-actions { grid-template-columns: 1fr; } }
    .quick-action {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--color-text);
      transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
    }
    .quick-action:hover { border-color: var(--color-primary); box-shadow: var(--shadow-md); }
    .qa-icon { font-size: 1.25rem; }
    .qa-title { font-weight: 700; font-size: 0.938rem; }
    .qa-sub { font-size: 0.75rem; color: var(--color-text-muted); }
    .element-stat {
      display: flex;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface-secondary);
      border-radius: var(--radius-md);
    }
  `]
})
export class DashboardPage {
  protected auth = inject(AuthService);
  private cardsService = inject(CardsService);
  private battlesService = inject(BattlesService);
  private questsService = inject(QuestsService);

  readonly quests = signal<UserQuestView[]>([]);
  readonly collection = signal<CollectionItem[]>([]);

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const [q, c, h] = await Promise.all([
        this.questsService.getDaily(),
        this.cardsService.getCollection(),
        this.battlesService.getHistory(),
      ]);
      this.quests.set(q);
      this.collection.set(c);
      void h;
    } catch {
      // Auth errors already handled by interceptor flow
    }
  }

  elementStats() {
    const counts = new Map<string, number>();
    for (const item of this.collection()) {
      counts.set(item.card.element, (counts.get(item.card.element) ?? 0) + item.copies);
    }
    const order = ['ember', 'tide', 'thorn', 'shadow', 'storm'] as const;
    return order
      .filter((e) => counts.has(e))
      .map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }
}
