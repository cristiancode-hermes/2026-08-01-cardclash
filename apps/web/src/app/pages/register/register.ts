import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="brand-icon">🛡</span>
          <h1>Join CardClash</h1>
          <p>Starter pack + 500 gold on us.</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="auth-form">
          <label>
            Username
            <input type="text" name="username" [(ngModel)]="username" required minlength="3" maxlength="30" autocomplete="username" />
          </label>
          <label>
            Email
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" />
          </label>

          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }

          <button class="btn btn-primary btn-block" type="submit" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Creating…' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-alt">Already a duelist? <a routerLink="/login">Log in</a></p>
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
    h1 { font-family: var(--font-display); font-size: 1.75rem; letter-spacing: -0.01em; }
    .auth-brand p { color: var(--color-text-muted); }
    .auth-form { display: flex; flex-direction: column; gap: var(--space-md); }
    .auth-alt { text-align: center; color: var(--color-text-muted); }
  `]
})
export class RegisterPage {
  protected auth = inject(AuthService);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  async onSubmit() {
    this.error.set('');
    try {
      await this.auth.register(this.email(), this.username(), this.password());
    } catch (e: any) {
      const msg = e?.error?.message;
      this.error.set(Array.isArray(msg) ? msg.join('. ') : (msg ?? 'Registration failed.'));
    }
  }
}
