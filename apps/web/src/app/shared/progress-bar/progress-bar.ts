import { Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="track" role="progressbar" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
      <div class="fill" [style.width.%]="pct()"></div>
    </div>
  `,
  styles: [`
    .track {
      width: 100%;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--color-surface-secondary);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: var(--radius-full);
      background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
      transition: width var(--duration-normal) var(--ease-out);
    }
  `]
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly max = input.required<number>();

  pct(): number {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((this.value() / max) * 100)));
  }
}
