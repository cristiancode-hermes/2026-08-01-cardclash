import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { LeaderboardResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  get(): Promise<LeaderboardResponse> {
    return firstValueFrom(this.http.get<LeaderboardResponse>(`${this.api}/leaderboard`));
  }
}
