import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BattlesService } from '../../services/battles.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import type { BattleSummary } from '../../models/models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, EmptyState],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Battle History</h1>
          <p class="subtitle">Your last 20 duels in the arena.</p>
        </div>
      </div>

      @if (summary(); as s) {
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: var(--space-2xl);">
          <div class="stat-card"><div class="stat-value" style="color: var(--color-success);">{{ s.wins }}</div><div class="stat-label">Wins</div></div>
          <div class="stat-card"><div class="stat-value" style="color: var(--color-danger);">{{ s.losses }}</div><div class="stat-label">Losses</div></div>
          <div class="stat-card"><div class="stat-value">{{ s.draws }}</div><div class="stat-label">Draws</div></div>
          <div class="stat-card"><div class="stat-value mono">{{ totalRatingDelta() > 0 ? '+' : '' }}{{ totalRatingDelta() }}</div><div class="stat-label">Net rating</div></div>
        </div>
      }

      @if (loading()) {
        <div class="skeleton skeleton-card" style="height: 200px;"></div>
      } @else if (battles().length === 0) {
        <app-empty-state icon="⚔" title="No battles yet" description="Enter the arena and fight your first duel." actionLabel="Battle now" (action)="{}" />
      } @else {
        <div class="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Result</th><th>Difficulty</th><th>Turns</th><th>XP</th><th>Gold</th><th>Rating</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              @for (b of battles(); track b.id) {
                <tr>
                  <td><span class="result-pill" [class.win]="b.result === 'win'" [class.loss]="b.result === 'loss'">{{ b.result }}</span></td>
                  <td class="capitalize">{{ b.difficulty }}</td>
                  <td class="mono">{{ b.turns }}</td>
                  <td class="mono">+{{ b.xpEarned }}</td>
                  <td class="mono">+{{ b.goldEarned }}</td>
                  <td class="mono" [class.pos]="b.ratingDelta > 0" [class.neg]="b.ratingDelta < 0">{{ b.ratingDelta > 0 ? '+' : '' }}{{ b.ratingDelta }}</td>
                  <td class="muted">{{ b.createdAt | date:'MMM d, HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .result-pill {
      display: inline-block;
      font-size: 0.688rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-secondary);
      color: var(--color-text-muted);
    }
    .result-pill.win { background: rgba(5, 150, 105, 0.12); color: var(--color-success); }
    .result-pill.loss { background: rgba(220, 38, 38, 0.12); color: var(--color-danger); }
    .pos { color: var(--color-success); }
    .neg { color: var(--color-danger); }
    .capitalize { text-transform: capitalize; }
    .muted { color: var(--color-text-muted); }
  `]
})
export class HistoryPage {
  private battlesService = inject(BattlesService);

  readonly battles = signal<BattleSummary[]>([]);
  readonly summary = signal<{ wins: number; losses: number; draws: number } | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const res = await this.battlesService.getHistory();
      this.battles.set(res.battles);
      this.summary.set(res.summary);
    } finally {
      this.loading.set(false);
    }
  }

  totalRatingDelta(): number {
    return this.battles().reduce((acc, b) => acc + b.ratingDelta, 0);
  }
}
