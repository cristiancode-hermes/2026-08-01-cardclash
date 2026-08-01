import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'CardClash API — Collectible Card Battle Game';
  }
}
