import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import type { LeaderboardResponse } from '../../models/models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [EmptyState],
  template: `
    <div class="container page" style="max-width: 760px;">
      <div class="page-header">
        <div>
          <h1>Leaderboard</h1>
          <p class="subtitle">The top duelists by Elo rating.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="skeleton skeleton-card" style="height: 300px;"></div>
      } @else if ((data()?.rows?.length ?? 0) === 0) {
        <app-empty-state icon="🏆" title="No duelists yet" description="Play battles to climb the ladder." />
      } @else if (data(); as d) {
        @if (d.myRank) {
          <div class="my-rank card" style="margin-bottom: var(--space-lg);">
            Your rank: <strong>#{{ d.myRank }}</strong>
          </div>
        }
        <div class="table-wrap card">
          <table>
            <thead>
              <tr><th>#</th><th>Duelist</th><th>Level</th><th>Rating</th><th>W / L</th></tr>
            </thead>
            <tbody>
              @for (row of d.rows; track row.rank) {
                <tr [class.me]="isMe(row.username)">
                  <td class="mono rank">{{ row.rank }}</td>
                  <td class="duelist">
                    <span class="avatar-mini">{{ row.username.charAt(0).toUpperCase() }}</span>
                    {{ row.username }} @if (isMe(row.username)) { <span class="you">(you)</span> }
                  </td>
                  <td class="mono">{{ row.level }}</td>
                  <td class="mono rating">{{ row.rating }}</td>
                  <td class="mono muted">{{ row.wins }} / {{ row.losses }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .rank { color: var(--color-accent); font-weight: 700; }
    .duelist { display: flex; align-items: center; gap: var(--space-sm); font-weight: 600; }
    .avatar-mini {
      width: 26px;
      height: 26px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .rating { font-weight: 700; }
    .you { color: var(--color-primary); font-size: 0.75rem; }
    tr.me { background: rgba(29, 78, 216, 0.07); }
    .my-rank { padding: var(--space-md) var(--space-lg); }
  `]
})
export class LeaderboardPage {
  private leaderboardService = inject(LeaderboardService);
  private auth = inject(AuthService);

  readonly data = signal<LeaderboardResponse | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.load();
  }

  private async load() {
    try {
      this.data.set(await this.leaderboardService.get());
    } finally {
      this.loading.set(false);
    }
  }

  isMe(username: string): boolean {
    return this.auth.currentUser()?.username === username;
  }
}
