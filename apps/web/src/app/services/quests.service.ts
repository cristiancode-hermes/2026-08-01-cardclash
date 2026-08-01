import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { UserQuestView, ClaimResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class QuestsService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  getDaily(): Promise<UserQuestView[]> {
    return firstValueFrom(this.http.get<UserQuestView[]>(`${this.api}/quests`));
  }

  claim(questId: string): Promise<ClaimResult> {
    return firstValueFrom(this.http.post<ClaimResult>(`${this.api}/quests/${questId}/claim`, {}));
  }
}
