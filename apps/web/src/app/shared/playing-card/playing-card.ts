import { Component, input, output } from '@angular/core';
import type { Card } from '../../models/models';

const ELEMENT_GLYPH: Record<string, string> = {
  ember: '🔥',
  tide: '💧',
  thorn: '🌿',
  shadow: '🌑',
  storm: '⚡',
};

@Component({
  selector: 'app-playing-card',
  standalone: true,
  template: `
    <div class="pc" [class.selected]="selected()" [class.disabled]="disabled()" [class.small]="small()"
         [style.--element]="elementColor(card().element)" [style.--rarity]="rarityColor(card().rarity)"
         (click)="!disabled() && clicked.emit(card())"
         [attr.aria-label]="card().name + ' — ' + card().attack + ' attack, ' + card().health + ' health, ' + card().cost + ' cost'"
         role="button" tabindex="0"
         (keydown.enter)="!disabled() && clicked.emit(card())">
      <div class="pc-cost">{{ card().cost }}</div>
      <div class="pc-art">
        <span class="pc-glyph">{{ glyph(card().element) }}</span>
      </div>
      <div class="pc-body">
        <div class="pc-name">{{ card().name }}</div>
        <div class="pc-sub">
          <span class="pc-element">{{ card().element }}</span>
          <span class="pc-ability" [class.has]="card().ability">{{ card().ability ?? '—' }}</span>
        </div>
        <div class="pc-stats">
          <span class="pc-atk">{{ card().attack }}</span>
          <span class="pc-hp">{{ card().health }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pc {
      width: 128px;
      aspect-ratio: 5 / 7;
      border-radius: var(--radius-lg);
      border: 2px solid var(--rarity);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
      user-select: none;
    }
    .pc:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
    }
    .pc.selected {
      outline: 3px solid var(--color-primary);
      outline-offset: 2px;
      box-shadow: 0 0 0 2px var(--color-surface), 0 0 14px rgba(29, 78, 216, 0.35);
    }
    .pc.disabled {
      opacity: 0.4;
      filter: grayscale(0.7);
      cursor: not-allowed;
      pointer-events: none;
    }
    .pc.small { width: 96px; }

    .pc-cost {
      position: absolute;
      top: 6px;
      left: 6px;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-full);
      background: radial-gradient(circle at 35% 30%, #60A5FA, #1D4ED8);
      color: #fff;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .pc-art {
      height: 45%;
      background: linear-gradient(160deg, var(--element), color-mix(in srgb, var(--element) 30%, var(--color-surface)));
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .pc-glyph { font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
    .pc-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 6px 8px 8px;
      gap: 2px;
    }
    .pc-name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.75rem;
      line-height: 1.15;
      color: var(--color-text);
      text-wrap: balance;
    }
    .pc-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.625rem;
      color: var(--color-text-muted);
      text-transform: capitalize;
      margin-top: auto;
    }
    .pc-ability.has { color: var(--element); font-weight: 700; text-transform: uppercase; font-size: 0.5625rem; letter-spacing: 0.04em; }
    .pc-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .pc-atk, .pc-hp {
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 1.125rem;
      color: #fff;
    }
    .pc-atk { background: var(--color-secondary); }
    .pc-hp { background: var(--color-success); }
  `]
})
export class PlayingCard {
  readonly card = input.required<Card>();
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly small = input(false);
  readonly clicked = output<Card>();

  glyph(element: string): string {
    return ELEMENT_GLYPH[element] ?? '🃏';
  }

  elementColor(element: string): string {
    const colors: Record<string, string> = {
      ember: '#EF4444', tide: '#3B82F6', thorn: '#22C55E', shadow: '#8B5CF6', storm: '#06B6D4',
    };
    return colors[element] ?? '#94A3B8';
  }

  rarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#94A3B8', rare: '#3B82F6', epic: '#8B5CF6', legendary: '#F59E0B',
    };
    return colors[rarity] ?? '#94A3B8';
  }
}
