import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Deck } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DecksService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  getAll(): Promise<Deck[]> {
    return firstValueFrom(this.http.get<Deck[]>(`${this.api}/decks`));
  }

  getById(id: string): Promise<Deck> {
    return firstValueFrom(this.http.get<Deck>(`${this.api}/decks/${id}`));
  }

  create(name: string, cardIds: string[]): Promise<Deck> {
    return firstValueFrom(this.http.post<Deck>(`${this.api}/decks`, { name, cardIds }));
  }

  update(id: string, data: { name?: string; cardIds?: string[] }): Promise<Deck> {
    return firstValueFrom(this.http.patch<Deck>(`${this.api}/decks/${id}`, data));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/decks/${id}`));
  }
}
