import { Component, input } from '@angular/core';
import type { User } from '../../models/models';

@Component({
  selector: 'app-player-badges',
  standalone: true,
  template: `
    <div class="badges">
      <span class="badge badge-level">Lv {{ user().level }}</span>
      <span class="badge badge-gold">🪙 {{ user().gold }}</span>
      <span class="badge badge-dust">✨ {{ user().dust }}</span>
      <span class="badge badge-rating">{{ user().rating }}</span>
    </div>
  `,
  styles: [`
    .badges {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .badge-level {
      background: rgba(29, 78, 216, 0.1);
      color: var(--color-primary);
    }
    .badge-gold {
      background: rgba(217, 119, 6, 0.12);
      color: var(--color-accent);
    }
    .badge-dust {
      background: rgba(139, 92, 246, 0.12);
      color: #8B5CF6;
    }
    .badge-rating {
      background: var(--color-surface-secondary);
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }
    @media (max-width: 768px) {
      .badge-dust, .badge-rating { display: none; }
    }
  `]
})
export class PlayerBadges {
  readonly user = input.required<User>();
}
