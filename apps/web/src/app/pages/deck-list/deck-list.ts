import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecksService } from '../../services/decks.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import type { Deck } from '../../models/models';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [RouterLink, EmptyState, ConfirmDialog],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Decks</h1>
          <p class="subtitle">Assemble 15–30 cards into your battle formation.</p>
        </div>
        <button class="btn btn-primary" (click)="createDeck()">+ New deck</button>
      </div>

      @if (loading()) {
        <div class="grid">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton skeleton-card"></div>
          }
        </div>
      } @else if (decks().length === 0) {
        <app-empty-state
          icon="🂠"
          title="No decks yet"
          description="Create your first deck from your collection and enter the arena."
          actionLabel="Create your first deck"
          (action)="createDeck()"
        />
      } @else {
        <div class="grid">
          @for (deck of decks(); track deck.id) {
            <div class="deck-card">
              <div class="deck-card-head">
                <h2>{{ deck.name }}</h2>
                @if (deck.isDefault) {
                  <span class="badge-default">Default</span>
                }
              </div>
              <p class="mono muted">{{ deck.cardIds.length }}/30 cards</p>
              <div class="deck-card-actions">
                <a [routerLink]="['/decks', deck.id]" class="btn btn-secondary btn-sm">Edit</a>
                <button class="btn btn-ghost btn-sm" (click)="askDelete(deck)">Delete</button>
              </div>
            </div>
          }
        </div>
      }

      <app-confirm-dialog
        [open]="!!pendingDelete()"
        title="Delete deck?"
        [message]="'Are you sure you want to delete ' + (pendingDelete()?.name ?? '') + '? This cannot be undone.'"
        confirmLabel="Delete"
        (confirm)="confirmDelete()"
        (cancel)="pendingDelete.set(null)"
      />
    </div>
  `,
  styles: [`
    .deck-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
    }
    .deck-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .deck-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }
    .deck-card h2 { font-size: 1.125rem; }
    .badge-default {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-primary);
      background: rgba(29, 78, 216, 0.1);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }
    .deck-card-actions {
      display: flex;
      gap: var(--space-sm);
      margin-top: auto;
    }
  `]
})
export class DeckListPage {
  private decksService = inject(DecksService);
  private router = inject(Router);

  readonly decks = signal<Deck[]>([]);
  readonly loading = signal(true);
  readonly pendingDelete = signal<Deck | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    try {
      this.decks.set(await this.decksService.getAll());
    } finally {
      this.loading.set(false);
    }
  }

  async createDeck() {
    const created = await this.decksService.create(`Deck ${this.decks().length + 1}`, []);
    this.router.navigate(['/decks', created.id]);
  }

  askDelete(deck: Deck) {
    this.pendingDelete.set(deck);
  }

  async confirmDelete() {
    const deck = this.pendingDelete();
    if (!deck) return;
    await this.decksService.remove(deck.id);
    this.pendingDelete.set(null);
    this.decks.set(this.decks().filter((d) => d.id !== deck.id));
  }
}
