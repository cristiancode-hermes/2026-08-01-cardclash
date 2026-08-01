import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { User, AuthResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = '/api';
  private readonly tokenKey = 'cardclash_token';

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = signal(false);
  readonly loading = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUser();
  }

  hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  async login(email: string, password: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.api}/auth/login`, { email, password }));
      this.setSession(res);
      this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  async register(email: string, username: string, password: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.api}/auth/register`, { email, username, password }));
      this.setSession(res);
      this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  async getMe(): Promise<void> {
    if (!this.hasToken()) return;
    try {
      const user = await firstValueFrom(this.http.get<User>(`${this.api}/auth/me`));
      this.currentUser.set(user);
      this.isLoggedIn.set(true);
    } catch {
      this.logout();
    }
  }

  async updateProfile(data: { username?: string; avatarUrl?: string; defaultDifficulty?: string }): Promise<User> {
    const user = await firstValueFrom(this.http.patch<User>(`${this.api}/auth/profile`, data));
    this.currentUser.set(user);
    return user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.api}/auth/password`, { currentPassword, newPassword }));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(this.tokenKey, res.token);
    this.currentUser.set(res.user);
    this.isLoggedIn.set(true);
  }

  private loadUser() {
    if (this.hasToken()) {
      this.getMe();
    }
  }
}
