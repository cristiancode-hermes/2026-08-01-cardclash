import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AchievementView, ClaimResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  getAll(): Promise<AchievementView[]> {
    return firstValueFrom(this.http.get<AchievementView[]>(`${this.api}/achievements`));
  }

  claim(achievementId: string): Promise<ClaimResult> {
    return firstValueFrom(this.http.post<ClaimResult>(`${this.api}/achievements/${achievementId}/claim`, {}));
  }
}
