import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { QuestsService } from '../../services/quests.service';
import { AchievementsService } from '../../services/achievements.service';
import { ProgressBar } from '../../shared/progress-bar/progress-bar';
import { EmptyState } from '../../shared/empty-state/empty-state';
import type { AchievementView, UserQuestView } from '../../models/models';

@Component({
  selector: 'app-quests',
  standalone: true,
  imports: [ProgressBar, EmptyState],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Quests & Achievements</h1>
          <p class="subtitle">Complete objectives for gold and XP.</p>
        </div>
      </div>

      <div class="grid two-col">
        <section class="card">
          <h2 style="margin-bottom: var(--space-md);">Daily quests</h2>
          @if (quests().length === 0) {
            <app-empty-state icon="📜" title="No quests today" />
          } @else {
            <div class="quest-list">
              @for (q of quests(); track q.questId) {
                <div class="quest-item" [class.completed]="q.isCompleted" [class.claimed]="!!q.claimedAt">
                  <div class="quest-head">
                    <div>
                      <div class="quest-title">{{ q.title }}</div>
                      <div class="quest-desc">{{ q.description }}</div>
                    </div>
                    @if (!q.claimedAt) {
                      <button class="btn btn-accent btn-sm" [disabled]="!q.isCompleted || claiming() === q.questId"
                              (click)="claimQuest(q)">
                        {{ q.isCompleted ? 'Claim' : 'In progress' }}
                      </button>
                    } @else {
                      <span class="claimed-tag">✓ Claimed</span>
                    }
                  </div>
                  <app-progress-bar [value]="q.progress" [max]="q.target" />
                  <div class="quest-reward mono muted">
                    +{{ q.rewardGold }}🪙 · +{{ q.rewardXp }} XP
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2 style="margin-bottom: var(--space-md);">Achievements</h2>
          @if (achievements().length === 0) {
            <app-empty-state icon="🏅" title="No achievements" />
          } @else {
            <div class="quest-list">
              @for (a of achievements(); track a.id) {
                <div class="quest-item" [class.locked]="!a.unlocked" [class.claimed]="a.claimed">
                  <div class="quest-head">
                    <div>
                      <div class="quest-title">{{ a.name }}</div>
                      <div class="quest-desc">{{ a.description }}</div>
                    </div>
                    @if (a.unlocked && !a.claimed) {
                      <button class="btn btn-accent btn-sm" [disabled]="claiming() === a.id" (click)="claimAchievement(a)">
                        Claim
                      </button>
                    } @else if (a.claimed) {
                      <span class="claimed-tag">✓ Claimed</span>
                    } @else {
                      <span class="locked-tag">🔒</span>
                    }
                  </div>
                  <div class="quest-reward mono muted">+{{ a.rewardGold }}🪙 · +{{ a.rewardXp }} XP</div>
                </div>
              }
            </div>
          }
        </section>
      </div>

      @if (error()) {
        <div class="alert alert-danger" style="margin-top: var(--space-lg);" role="alert">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .two-col {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
      align-items: start;
    }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
    .quest-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .quest-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: opacity var(--duration-fast) var(--ease-out);
    }
    .quest-item.completed { border-color: var(--color-success); }
    .quest-item.claimed { opacity: 0.65; }
    .quest-item.locked { opacity: 0.6; }
    .quest-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); }
    .quest-title { font-weight: 700; }
    .quest-desc { font-size: 0.813rem; color: var(--color-text-muted); }
    .quest-reward { font-size: 0.75rem; }
    .claimed-tag { color: var(--color-success); font-weight: 700; font-size: 0.813rem; }
    .locked-tag { font-size: 0.875rem; }
  `]
})
export class QuestsPage {
  private questsService = inject(QuestsService);
  private achievementsService = inject(AchievementsService);
  private auth = inject(AuthService);

  readonly quests = signal<UserQuestView[]>([]);
  readonly achievements = signal<AchievementView[]>([]);
  readonly claiming = signal<string | null>(null);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const [q, a] = await Promise.all([this.questsService.getDaily(), this.achievementsService.getAll()]);
      this.quests.set(q);
      this.achievements.set(a);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not load quests');
    }
  }

  async claimQuest(q: UserQuestView) {
    this.claiming.set(q.questId);
    try {
      await this.questsService.claim(q.questId);
      await this.auth.getMe();
      await this.load();
    } finally {
      this.claiming.set(null);
    }
  }

  async claimAchievement(a: AchievementView) {
    this.claiming.set(a.id);
    try {
      await this.achievementsService.claim(a.id);
      await this.auth.getMe();
      await this.load();
    } finally {
      this.claiming.set(null);
    }
  }
}
