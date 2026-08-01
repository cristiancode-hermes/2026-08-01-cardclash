import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Pack, OpenPackResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PacksService {
  private readonly api = '/api';

  constructor(private http: HttpClient) {}

  getPacks(): Promise<Pack[]> {
    return firstValueFrom(this.http.get<Pack[]>(`${this.api}/packs`));
  }

  openPack(packId: string): Promise<OpenPackResult> {
    return firstValueFrom(this.http.post<OpenPackResult>(`${this.api}/packs/${packId}/open`, {}));
  }
}
