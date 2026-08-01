import { Component, input } from '@angular/core';
import type { Element, Rarity } from '../../models/models';

@Component({
  selector: 'app-element-pill',
  standalone: true,
  template: `
    <span class="pill" [style.--el]="color(element())">
      <span class="dot"></span>{{ element() }}
    </span>
  `,
  styles: [`
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.688rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--el);
      background: color-mix(in srgb, var(--el) 12%, transparent);
      padding: 2px 10px;
      border-radius: var(--radius-full);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--el);
    }
  `]
})
export class ElementPill {
  readonly element = input.required<Element>();

  color(el: Element): string {
    const colors: Record<string, string> = {
      ember: '#EF4444', tide: '#3B82F6', thorn: '#22C55E', shadow: '#8B5CF6', storm: '#06B6D4',
    };
    return colors[el] ?? '#94A3B8';
  }
}
