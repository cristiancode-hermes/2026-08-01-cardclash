import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PacksService } from '../../services/packs.service';
import { PlayingCard } from '../../shared/playing-card/playing-card';
import { EmptyState } from '../../shared/empty-state/empty-state';
import type { Card, Pack } from '../../models/models';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [PlayingCard, EmptyState],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Card Shop</h1>
          <p class="subtitle">Spend gold on packs. Rarer cards drop with better odds in pricier packs.</p>
        </div>
      </div>

      @if (packs().length === 0) {
        <div class="grid">
          @for (i of [1,2,3]; track i) { <div class="skeleton skeleton-card"></div> }
        </div>
      } @else {
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          @for (pack of packs(); track pack.id) {
            <div class="pack-card" [style.--pack-color]="packColor(pack)">
              <div class="pack-art">
                <span class="pack-glyph">🃏</span>
                <span class="pack-guarantee">{{ pack.guaranteedRarity }} guaranteed</span>
              </div>
              <div class="pack-body">
                <h2>{{ pack.name }}</h2>
                <p class="pack-desc">{{ pack.cardCount }} cards · odds below</p>
                <div class="odds">
                  @for (entry of oddsEntries(pack.dropRates); track entry[0]) {
                    <div class="odd-row">
                      <span class="capitalize">{{ entry[0] }}</span>
                      <span class="mono">{{ Math.round(entry[1] * 100) }}%</span>
                    </div>
                  }
                </div>
                <button class="btn btn-accent btn-block" [disabled]="openingId() === pack.id"
                        (click)="open(pack)">
                  🪙 {{ pack.price }} — {{ openingId() === pack.id ? 'Opening…' : 'Open' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger" style="margin-top: var(--space-lg);" role="alert">{{ error() }}</div>
      }

      <!-- Reveal overlay -->
      @if (reveal(); as r) {
        <div class="overlay" (click)="closeReveal()">
          <div class="reveal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <h2>Pack opened!</h2>
            <p class="subtitle">@if (r.dustGained > 0) { +{{ r.dustGained }} dust from duplicates }</p>
            <div class="reveal-grid">
              @for (card of r.pulled; track $index) {
                <div class="reveal-item" [style.animation-delay.ms]="$index * 120">
                  <app-playing-card [card]="card" [selected]="card.rarity === topRarity(r.pulled)" />
                </div>
              }
            </div>
            <div class="flex gap-sm" style="justify-content: center; margin-top: var(--space-lg);">
              <button class="btn btn-primary" (click)="closeReveal()">Nice!</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pack-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }
    .pack-art {
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, var(--pack-color), color-mix(in srgb, var(--pack-color) 25%, var(--color-surface)));
      position: relative;
    }
    .pack-glyph { font-size: 3.5rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
    .pack-guarantee {
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 0.625rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: rgba(255,255,255,0.85);
      color: #0F172A;
      border-radius: var(--radius-full);
      padding: 2px 10px;
    }
    .pack-body { padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm); flex: 1; }
    .pack-desc { color: var(--color-text-muted); font-size: 0.813rem; }
    .odds { display: flex; flex-direction: column; gap: 2px; margin-bottom: var(--space-sm); }
    .odd-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg);
    }
    .reveal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xl);
      max-width: 720px;
      width: 100%;
      text-align: center;
    }
    .reveal-grid {
      display: flex;
      justify-content: center;
      gap: var(--space-md);
      flex-wrap: wrap;
      margin-top: var(--space-md);
    }
    .reveal-item { animation: flip-in var(--duration-normal) var(--ease-out) backwards; }
    @keyframes flip-in {
      from { opacity: 0; transform: translateY(12px) scale(0.92); }
      to { opacity: 1; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .reveal-item { animation: none; }
    }
  `]
})
export class ShopPage {
  private packsService = inject(PacksService);
  private auth = inject(AuthService);

  readonly packs = signal<Pack[]>([]);
  readonly reveal = signal<{ pulled: Card[]; dustGained: number } | null>(null);
  readonly openingId = signal<string | null>(null);
  readonly error = signal('');
  readonly Math = Math;

  constructor() {
    this.load();
  }

  private async load() {
    try {
      this.packs.set(await this.packsService.getPacks());
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not load packs');
    }
  }

  packColor(pack: Pack): string {
    const colors: Record<string, string> = {
      'Ember Pack': '#EF4444', 'Frost Pack': '#3B82F6', 'Mythic Pack': '#8B5CF6',
    };
    return colors[pack.name] ?? '#1D4ED8';
  }

  oddsEntries(dropRates: Record<string, number>): [string, number][] {
    return Object.entries(dropRates).sort((a, b) => b[1] - a[1]);
  }

  async open(pack: Pack) {
    this.error.set('');
    this.openingId.set(pack.id);
    try {
      const res = await this.packsService.openPack(pack.id);
      this.reveal.set({ pulled: res.pulled, dustGained: res.dustGained });
      await this.auth.getMe();
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not open pack');
    } finally {
      this.openingId.set(null);
    }
  }

  topRarity(cards: Card[]): string {
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 } as Record<string, number>;
    return cards.reduce((top, c) => (rank[c.rarity] > rank[top] ? c.rarity : top), 'common');
  }

  closeReveal() {
    this.reveal.set(null);
  }
}
