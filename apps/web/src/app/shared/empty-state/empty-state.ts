import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <div class="empty-icon">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      @if (actionLabel()) {
        <button class="btn btn-primary" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: [`
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      text-align: center;
      padding: var(--space-3xl) var(--space-xl);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-secondary);
    }
    .empty-icon { font-size: 2.5rem; }
    p { color: var(--color-text-muted); max-width: 42ch; }
  `]
})
export class EmptyState {
  readonly icon = input('🃏');
  readonly title = input('');
  readonly description = input('');
  readonly actionLabel = input('');
  readonly action = output();
}
