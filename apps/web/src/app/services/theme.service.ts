import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'cardclash_theme';
  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem(this.key);
    if (saved === 'dark') {
      this.isDark.set(true);
    } else if (saved === 'light') {
      this.isDark.set(false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDark.set(prefersDark);
    }
    this.applyTheme();

    effect(() => {
      this.applyTheme();
    });
  }

  toggle() {
    this.isDark.update(v => !v);
    localStorage.setItem(this.key, this.isDark() ? 'dark' : 'light');
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
  }
}
