import { Component, input } from '@angular/core';
import type { Rarity } from '../../models/models';

@Component({
  selector: 'app-rarity-badge',
  standalone: true,
  template: `
    <span class="badge" [style.--r]="color(rarity())">{{ rarity() }}</span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--r);
      border: 1px solid var(--r);
      border-radius: var(--radius-sm);
      padding: 1px 8px;
      background: color-mix(in srgb, var(--r) 10%, transparent);
    }
  `]
})
export class RarityBadge {
  readonly rarity = input.required<Rarity>();

  color(r: Rarity): string {
    const colors: Record<string, string> = {
      common: '#94A3B8', rare: '#3B82F6', epic: '#8B5CF6', legendary: '#F59E0B',
    };
    return colors[r] ?? '#94A3B8';
  }
}
