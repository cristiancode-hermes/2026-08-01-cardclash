import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Card, CollectionItem } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  getAll(): Promise<Card[]> {
    return firstValueFrom(this.http.get<Card[]>(`${this.api}/cards`));
  }

  getCollection(): Promise<CollectionItem[]> {
    return firstValueFrom(this.http.get<CollectionItem[]>(`${this.api}/cards/collection`));
  }

  getById(id: string): Promise<Card> {
    return firstValueFrom(this.http.get<Card>(`${this.api}/cards/${id}`));
  }
}
