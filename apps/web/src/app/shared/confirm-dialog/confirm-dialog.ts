import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div class="overlay" (click)="cancel.emit()">
        <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h3>{{ title() }}</h3>
          <p>{{ message() }}</p>
          <div class="actions">
            <button class="btn btn-ghost" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn-danger" (click)="confirm.emit()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg);
    }
    .dialog {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xl);
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    p { color: var(--color-text-muted); }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
    }
  `]
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly confirm = output();
  readonly cancel = output();
}
