import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecksService } from '../../services/decks.service';
import { CardsService } from '../../services/cards.service';
import { AuthService } from '../../services/auth.service';
import { PlayingCard } from '../../shared/playing-card/playing-card';
import { ElementPill } from '../../shared/element-pill/element-pill';
import type { Card, CollectionItem, Deck, Element } from '../../models/models';

const MIN_DECK = 15;
const MAX_DECK = 30;

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [RouterLink, PlayingCard, ElementPill],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>{{ deckName() || 'Deck Builder' }}</h1>
          <p class="subtitle mono">{{ deckSize() }}/{{ MAX_DECK }} cards · {{ validation() }}</p>
        </div>
        <div class="flex gap-sm">
          <a routerLink="/decks" class="btn btn-ghost">Back</a>
          <button class="btn btn-primary" [disabled]="!canSave()" (click)="save()">Save deck</button>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger" role="alert">{{ error() }}</div>
      }

      <div class="builder">
        <!-- Collection pane -->
        <section class="pane">
          <div class="pane-head">
            <h2>Collection</h2>
            <div class="filter-group">
              @for (e of elements; track e) {
                <button class="chip" [class.active]="elementFilter() === e" (click)="elementFilter.set(e)">{{ e }}</button>
              }
            </div>
          </div>
          <div class="card-pool">
            @for (item of pool(); track item.card.id) {
              <div class="pool-item" [class.exhausted]="poolCount(item.card.id) >= copiesOwned(item.card.id)">
                <app-playing-card
                  [card]="item.card"
                  [small]="true"
                  [disabled]="poolCount(item.card.id) >= copiesOwned(item.card.id)"
                  (clicked)="addToDeck(item.card)"
                />
                <span class="pool-count mono">{{ poolCount(item.card.id) }}/{{ copiesOwned(item.card.id) }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Deck pane -->
        <section class="pane deck-pane">
          <div class="pane-head">
            <h2>Your deck</h2>
            <span class="mono muted">{{ deckSize() }}/{{ MAX_DECK }}</span>
          </div>

          <div class="mana-curve">
            @for (slot of curve(); track $index) {
              <div class="curve-col" [title]="'Cost ' + $index + ': ' + slot + ' cards'">
                <div class="curve-bar" [style.height.%]="curvePct(slot)"></div>
                <span class="mono curve-label">{{ $index }}</span>
              </div>
            }
          </div>

          @if (deck().length === 0) {
            <div class="deck-empty">Click cards on the left to add them. Minimum {{ MIN_DECK }} cards.</div>
          } @else {
            <div class="deck-list">
              @for (item of deckItems(); track $index) {
                <div class="deck-row" [class.new]="isNew(item.card.id)" (click)="removeFromDeck(item.card.id)">
                  <span class="mono deck-cost">{{ item.card.cost }}</span>
                  <span class="deck-name">{{ item.card.name }}</span>
                  <app-element-pill [element]="item.card.element" />
                  <span class="mono deck-copies">×{{ item.count }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .builder {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
      align-items: start;
    }
    @media (max-width: 1000px) { .builder { grid-template-columns: 1fr; } }
    .pane {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .pane-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
      flex-wrap: wrap;
    }
    .filter-group { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
    .chip {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-size: 0.688rem;
      font-weight: 600;
      text-transform: capitalize;
      padding: 2px 10px;
      border-radius: var(--radius-full);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .card-pool {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: var(--space-md);
      max-height: 70vh;
      overflow-y: auto;
      padding: var(--space-xs);
    }
    .pool-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .pool-item.exhausted { opacity: 0.55; }
    .pool-count { font-size: 0.688rem; color: var(--color-text-muted); }
    .mana-curve {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 90px;
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .curve-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      height: 100%;
    }
    .curve-bar {
      width: 100%;
      max-width: 26px;
      background: linear-gradient(180deg, var(--color-primary), var(--color-accent));
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      min-height: 2px;
      transition: height var(--duration-normal) var(--ease-out);
    }
    .curve-label { font-size: 0.625rem; color: var(--color-text-muted); }
    .deck-empty {
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-xl);
      text-align: center;
      color: var(--color-text-muted);
    }
    .deck-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 55vh;
      overflow-y: auto;
    }
    .deck-row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--duration-fast) var(--ease-out);
    }
    .deck-row:hover { background: var(--color-surface-secondary); }
    .deck-row.new { background: rgba(217, 119, 6, 0.08); }
    .deck-cost {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-full);
      background: radial-gradient(circle at 35% 30%, #60A5FA, #1D4ED8);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .deck-name { flex: 1; font-weight: 600; font-size: 0.875rem; }
    .deck-copies { font-size: 0.75rem; color: var(--color-text-muted); }
  `]
})
export class DeckBuilderPage {
  private decksService = inject(DecksService);
  private cardsService = inject(CardsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly elements: Element[] = ['ember', 'tide', 'thorn', 'shadow', 'storm'];
  readonly MIN_DECK = MIN_DECK;
  readonly MAX_DECK = MAX_DECK;

  readonly deckId = signal<string | null>(null);
  readonly deckName = signal('');
  readonly deck = signal<{ card: Card; count: number }[]>([]);
  readonly collection = signal<CollectionItem[]>([]);
  readonly elementFilter = signal<Element | null>(null);
  readonly error = signal('');
  readonly newCardIds = signal<string[]>([]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('deckId');
    this.deckId.set(id);
    this.load();
  }

  private async load() {
    const [collection] = await Promise.all([this.cardsService.getCollection()]);
    this.collection.set(collection);
    const id = this.deckId();
    if (id && id !== 'new') {
      try {
        const deck = await this.decksService.getById(id);
        this.deckName.set(deck.name);
        const counts = new Map<string, number>();
        for (const cid of deck.cardIds) counts.set(cid, (counts.get(cid) ?? 0) + 1);
        const byId = new Map(collection.map((i) => [i.card.id, i.card]));
        this.deck.set([...counts.entries()]
          .filter(([cid]) => byId.has(cid))
          .map(([cid, count]) => ({ card: byId.get(cid)!, count })));
      } catch {
        this.error.set('Deck not found');
      }
    }
  }

  pool(): CollectionItem[] {
    const el = this.elementFilter();
    return this.collection()
      .filter((i) => !el || i.card.element === el)
      .filter((i) => i.copies > 0)
      .sort((a, b) => a.card.cost - b.card.cost);
  }

  deckSize(): number {
    return this.deck().reduce((acc, i) => acc + i.count, 0);
  }

  poolCount(cardId: string): number {
    return this.deck().find((d) => d.card.id === cardId)?.count ?? 0;
  }

  copiesOwned(cardId: string): number {
    return this.collection().find((c) => c.card.id === cardId)?.copies ?? 0;
  }

  addToDeck(card: Card) {
    if (this.deckSize() >= MAX_DECK) {
      this.error.set(`Deck cannot have more than ${MAX_DECK} cards`);
      return;
    }
    const cur = this.deck();
    const idx = cur.findIndex((d) => d.card.id === card.id);
    if (idx >= 0) {
      if (cur[idx].count >= this.copiesOwned(card.id)) return;
      cur[idx] = { ...cur[idx], count: cur[idx].count + 1 };
    } else {
      cur.push({ card, count: 1 });
    }
    this.deck.set([...cur]);
    this.newCardIds.set([...this.newCardIds(), card.id]);
    this.error.set('');
  }

  removeFromDeck(cardId: string) {
    const cur = this.deck();
    const idx = cur.findIndex((d) => d.card.id === cardId);
    if (idx < 0) return;
    if (cur[idx].count > 1) {
      cur[idx] = { ...cur[idx], count: cur[idx].count - 1 };
    } else {
      cur.splice(idx, 1);
    }
    this.deck.set([...cur]);
  }

  isNew(cardId: string): boolean {
    return this.newCardIds().includes(cardId);
  }

  deckItems() {
    return [...this.deck()].sort((a, b) => a.card.cost - b.card.cost);
  }

  curve(): number[] {
    const curve = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const item of this.deck()) {
      const cost = Math.min(item.card.cost, 7);
      curve[cost] += item.count;
    }
    return curve;
  }

  curvePct(count: number): number {
    const max = Math.max(...this.curve(), 1);
    return (count / max) * 100;
  }

  validation(): string {
    const size = this.deckSize();
    if (size < MIN_DECK) return `${MIN_DECK - size} more to go`;
    if (size > MAX_DECK) return `${size - MAX_DECK} over the limit`;
    return 'Ready to battle ✓';
  }

  canSave(): boolean {
    return this.deckSize() >= MIN_DECK && this.deckSize() <= MAX_DECK;
  }

  async save() {
    const cardIds = this.deck().flatMap((d) => Array(d.count).fill(d.card.id));
    const id = this.deckId();
    try {
      if (id && id !== 'new') {
        await this.decksService.update(id, { cardIds });
      } else {
        const created = await this.decksService.create(this.deckName() || `Deck ${new Date().toLocaleDateString()}`, cardIds);
        this.router.navigate(['/decks', created.id], { replaceUrl: true });
        this.deckId.set(created.id);
      }
      await this.auth.getMe();
      this.error.set('');
      this.newCardIds.set([]);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not save deck');
    }
  }
}
