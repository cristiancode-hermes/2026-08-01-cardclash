import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="brand-icon">⚔</span>
          <h1>CardClash</h1>
          <p>Enter the arena. Build your legend.</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="auth-form">
          <label>
            Email
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
          </label>

          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }

          <button class="btn btn-primary btn-block" type="submit" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Entering…' : 'Enter the Arena' }}
          </button>
        </form>

        <p class="auth-alt">New challenger? <a routerLink="/register">Create an account</a></p>
        <p class="auth-demo">Demo: emberqueen / demo1234</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(ellipse at 20% 0%, rgba(239, 68, 68, 0.08), transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(59, 130, 246, 0.1), transparent 50%),
        var(--color-background);
      padding: var(--space-lg);
    }
    .auth-card {
      width: 100%;
      max-width: 400px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-2xl);
      display: flex;
      flex-direction: column;
      gap: var(--space-xl);
    }
    .auth-brand { text-align: center; }
    .brand-icon { font-size: 2.5rem; display: block; margin-bottom: var(--space-sm); }
    h1 {
      font-family: var(--font-display);
      font-size: 1.75rem;
      letter-spacing: -0.01em;
    }
    .auth-brand p { color: var(--color-text-muted); }
    .auth-form { display: flex; flex-direction: column; gap: var(--space-md); }
    .auth-alt { text-align: center; color: var(--color-text-muted); }
    .auth-demo {
      text-align: center;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-surface-secondary);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
    }
  `]
})
export class LoginPage {
  protected auth = inject(AuthService);
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  async onSubmit() {
    this.error.set('');
    try {
      await this.auth.login(this.email(), this.password());
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Login failed. Check your credentials.');
    }
  }
}
