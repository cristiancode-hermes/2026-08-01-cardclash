import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { PlayerBadges } from '../../shared/player-badges/player-badges';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlayerBadges],
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <a routerLink="/dashboard" class="nav-logo">
          <span class="nav-logo-icon">⚔</span>
          CardClash
        </a>
      </div>

      <div class="nav-links">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-link" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
        <a routerLink="/collection" routerLinkActive="active" class="nav-link">Collection</a>
        <a routerLink="/decks" routerLinkActive="active" class="nav-link">Decks</a>
        <a routerLink="/battle" routerLinkActive="active" class="nav-link nav-link-cta">⚔ Battle</a>
        <a routerLink="/shop" routerLinkActive="active" class="nav-link">Shop</a>
        <a routerLink="/leaderboard" routerLinkActive="active" class="nav-link">Ladder</a>
      </div>

      <div class="nav-actions">
        @if (auth.currentUser(); as user) {
          <app-player-badges [user]="user" />
          <button class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ theme.isDark() ? '☀' : '☾' }}
          </button>
          <a routerLink="/settings" class="avatar" [title]="user.username">
            {{ user.username.charAt(0).toUpperCase() }}
          </a>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Log out</button>
        }
      </div>
    </nav>

    <div class="layout-body">
      <main class="layout-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .nav-logo-icon { font-family: var(--font-sans); }
    .avatar {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .nav-link-cta {
      color: var(--color-primary) !important;
      font-weight: 700;
    }
  `]
})
export class LayoutShell {
  public auth = inject(AuthService);
  public theme = inject(ThemeService);
  private router = inject(Router);
  readonly sidebarOpen = signal(false);
}
