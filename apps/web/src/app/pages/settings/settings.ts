import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container page" style="max-width: 640px;">
      <div class="page-header">
        <div>
          <h1>Settings</h1>
          <p class="subtitle">Manage your profile and preferences.</p>
        </div>
      </div>

      <section class="card" style="margin-bottom: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-md);">Profile</h2>
        @if (auth.currentUser(); as user) {
          <form (ngSubmit)="saveProfile()" class="form">
            <label>
              Username
              <input type="text" [(ngModel)]="username" name="username" required minlength="3" maxlength="30" />
            </label>
            <label>
              Default difficulty
              <select [(ngModel)]="difficulty" name="difficulty">
                <option value="apprentice">Apprentice</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
              </select>
            </label>
            @if (profileMsg()) {
              <div class="alert alert-success" role="status">{{ profileMsg() }}</div>
            }
            <div class="flex gap-sm">
              <button class="btn btn-primary" type="submit" [disabled]="saving()">Save changes</button>
            </div>
          </form>
        }
      </section>

      <section class="card" style="margin-bottom: var(--space-xl);">
        <h2 style="margin-bottom: var(--space-md);">Appearance</h2>
        <div class="flex-between">
          <div>
            <div style="font-weight: 600;">Dark mode</div>
            <div class="muted" style="font-size: 0.813rem;">Switch between frost and midnight battlefields.</div>
          </div>
          <button class="btn btn-secondary" (click)="theme.toggle()">
            {{ theme.isDark() ? '☀ Light mode' : '☾ Dark mode' }}
          </button>
        </div>
      </section>

      <section class="card">
        <h2 style="margin-bottom: var(--space-md);">Security</h2>
        <form (ngSubmit)="changePassword()" class="form">
          <label>
            Current password
            <input type="password" [(ngModel)]="currentPassword" name="currentPassword" required />
          </label>
          <label>
            New password
            <input type="password" [(ngModel)]="newPassword" name="newPassword" required minlength="8" />
          </label>
          @if (pwMsg()) {
            <div class="alert" [class.alert-success]="pwOk()" [class.alert-danger]="!pwOk()" role="status">{{ pwMsg() }}</div>
          }
          <button class="btn btn-secondary" type="submit" [disabled]="saving()">Change password</button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: var(--space-md); }
  `]
})
export class SettingsPage {
  protected auth = inject(AuthService);
  protected theme = inject(ThemeService);

  readonly username = signal('');
  readonly difficulty = signal('apprentice');
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly saving = signal(false);
  readonly profileMsg = signal('');
  readonly pwMsg = signal('');
  readonly pwOk = signal(false);

  constructor() {
    const user = this.auth.currentUser();
    if (user) {
      this.username.set(user.username);
      this.difficulty.set(user.defaultDifficulty);
    }
  }

  async saveProfile() {
    this.saving.set(true);
    this.profileMsg.set('');
    try {
      await this.auth.updateProfile({ username: this.username(), defaultDifficulty: this.difficulty() });
      this.profileMsg.set('Profile saved.');
    } finally {
      this.saving.set(false);
    }
  }

  async changePassword() {
    this.saving.set(true);
    this.pwMsg.set('');
    try {
      await this.auth.changePassword(this.currentPassword(), this.newPassword());
      this.pwOk.set(true);
      this.pwMsg.set('Password changed.');
      this.currentPassword.set('');
      this.newPassword.set('');
    } catch (e: any) {
      this.pwOk.set(false);
      this.pwMsg.set(e?.error?.message ?? 'Could not change password');
    } finally {
      this.saving.set(false);
    }
  }
}
