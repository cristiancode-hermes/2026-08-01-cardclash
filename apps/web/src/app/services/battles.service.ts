import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { BattleState, BattleSummary, Difficulty } from '../models/models';

@Injectable({ providedIn: 'root' })
export class BattlesService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  start(difficulty: Difficulty, deckId: string): Promise<BattleState> {
    return firstValueFrom(this.http.post<BattleState>(`${this.api}/battles`, { difficulty, deckId }));
  }

  getBattle(id: string): Promise<BattleState> {
    return firstValueFrom(this.http.get<BattleState>(`${this.api}/battles/${id}`));
  }

  playCard(id: string, cardId: string): Promise<BattleState> {
    return firstValueFrom(this.http.post<BattleState>(`${this.api}/battles/${id}/play`, { cardId }));
  }

  attack(id: string, attackerId: string, targetId: string): Promise<BattleState> {
    return firstValueFrom(this.http.post<BattleState>(`${this.api}/battles/${id}/attack`, { attackerId, targetId }));
  }

  endTurn(id: string): Promise<BattleState> {
    return firstValueFrom(this.http.post<BattleState>(`${this.api}/battles/${id}/end-turn`, {}));
  }

  getHistory(): Promise<{ battles: BattleSummary[]; summary: { wins: number; losses: number; draws: number } }> {
    return firstValueFrom(this.http.get<{ battles: BattleSummary[]; summary: { wins: number; losses: number; draws: number } }>(`${this.api}/battles/history`));
  }
}
