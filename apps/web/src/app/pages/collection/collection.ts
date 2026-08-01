import { Component, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { CardsService } from '../../services/cards.service';
import { PlayingCard } from '../../shared/playing-card/playing-card';
import { ElementPill } from '../../shared/element-pill/element-pill';
import { RarityBadge } from '../../shared/rarity-badge/rarity-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import type { CollectionItem, Element, Rarity } from '../../models/models';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [PlayingCard, ElementPill, RarityBadge, EmptyState, TitleCasePipe],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Collection</h1>
          <p class="subtitle">{{ collection().length }} unique cards · {{ totalCopies() }} total</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <button class="chip" [class.active]="elementFilter() === null" (click)="elementFilter.set(null)">All</button>
          @for (e of elements; track e) {
            <button class="chip" [class.active]="elementFilter() === e" (click)="elementFilter.set(e)">
              {{ e }}
            </button>
          }
        </div>
        <div class="filter-group">
          @for (r of rarities; track r) {
            <button class="chip" [class.active]="rarityFilter() === r" (click)="rarityFilter.set(r)">
              {{ r }}
            </button>
          }
        </div>
        <label class="owned-only">
          <input type="checkbox" [checked]="ownedOnly()" (change)="ownedOnly.set(!ownedOnly())" />
          Owned only
        </label>
      </div>

      @if (loading()) {
        <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: var(--space-md);">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="skeleton skeleton-card"></div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <app-empty-state icon="🃏" title="No cards match" description="Adjust your filters to see more cards." />
      } @else {
        <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: var(--space-md);">
          @for (item of filtered(); track item.card.id) {
            <div class="collection-item">
              <app-playing-card [card]="item.card" [disabled]="item.copies === 0" (clicked)="select(item)" />
              <div class="item-meta">
                <span class="copies" [class.zero]="item.copies === 0">×{{ item.copies }}</span>
                <app-rarity-badge [rarity]="item.card.rarity" />
              </div>
            </div>
          }
        </div>
      }

      <!-- Detail modal -->
      @if (selected(); as sel) {
        <div class="overlay" (click)="selected.set(null)">
          <div class="detail" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <div class="detail-left">
              <app-playing-card [card]="sel.card" [selected]="true" />
            </div>
            <div class="detail-right">
              <h2>{{ sel.card.name }}</h2>
              <div class="detail-tags">
                <app-element-pill [element]="sel.card.element" />
                <app-rarity-badge [rarity]="sel.card.rarity" />
              </div>
              <p class="detail-stats mono">
                Cost {{ sel.card.cost }} · {{ sel.card.attack }}⚔ · {{ sel.card.health }}❤
              </p>
              @if (sel.card.ability) {
                <p class="detail-ability">{{ sel.card.ability | titlecase }}: {{ sel.card.abilityValue ?? '' }}</p>
              }
              @if (sel.card.description) {
                <p class="detail-desc">{{ sel.card.description }}</p>
              }
              @if (sel.card.flavor) {
                <p class="detail-flavor">“{{ sel.card.flavor }}”</p>
              }
              <p class="detail-copies">You own <strong>{{ sel.copies }}</strong> copy{{ sel.copies === 1 ? '' : 's' }}</p>
              <button class="btn btn-ghost" (click)="selected.set(null)">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }
    .filter-group { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
    .chip {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }
    .owned-only {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.813rem;
      color: var(--color-text-muted);
      margin-left: auto;
      cursor: pointer;
    }
    .collection-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .item-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .copies {
      font-family: var(--font-mono);
      font-size: 0.813rem;
      font-weight: 700;
      color: var(--color-success);
    }
    .copies.zero { color: var(--color-text-muted); }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg);
    }
    .detail {
      display: flex;
      gap: var(--space-xl);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xl);
      max-width: 620px;
      width: 100%;
    }
    @media (max-width: 640px) { .detail { flex-direction: column; } }
    .detail-right { display: flex; flex-direction: column; gap: var(--space-sm); flex: 1; }
    .detail-tags { display: flex; gap: var(--space-sm); }
    .detail-stats { font-size: 1rem; }
    .detail-ability { color: var(--color-primary); font-weight: 700; }
    .detail-flavor { font-style: italic; color: var(--color-text-muted); }
  `]
})
export class CollectionPage {
  private cardsService = inject(CardsService);

  readonly elements: (Element | null)[] = [null, 'ember', 'tide', 'thorn', 'shadow', 'storm'];
  readonly rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

  readonly collection = signal<CollectionItem[]>([]);
  readonly elementFilter = signal<Element | null>(null);
  readonly rarityFilter = signal<Rarity | null>(null);
  readonly ownedOnly = signal(false);
  readonly loading = signal(true);
  readonly selected = signal<CollectionItem | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const all = await this.cardsService.getCollection();
      this.collection.set(all);
    } finally {
      this.loading.set(false);
    }
  }

  filtered(): CollectionItem[] {
    return this.collection().filter((item) => {
      if (this.elementFilter() && item.card.element !== this.elementFilter()) return false;
      if (this.rarityFilter() && item.card.rarity !== this.rarityFilter()) return false;
      if (this.ownedOnly() && item.copies === 0) return false;
      return true;
    });
  }

  totalCopies(): number {
    return this.collection().reduce((acc, i) => acc + i.copies, 0);
  }

  select(item: CollectionItem) {
    if (item.copies > 0) this.selected.set(item);
  }
}
