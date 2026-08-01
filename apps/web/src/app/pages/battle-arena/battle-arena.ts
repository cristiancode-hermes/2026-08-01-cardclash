import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BattlesService } from '../../services/battles.service';
import { AuthService } from '../../services/auth.service';
import type { BattleState, Card, Minion } from '../../models/models';

@Component({
  selector: 'app-battle-arena',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="arena">
      <!-- Turn banner -->
      <div class="turn-banner" [class.enemy]="state()?.phase === 'enemy'" [class.done]="isOver()">
        {{ bannerText() }}
      </div>

      @if (state(); as s) {
        <!-- Enemy zone -->
        <div class="zone enemy-zone">
          <div class="zone-head">
            <span class="hero-name">Enemy</span>
            <div class="hero-hp" [class.low]="s.enemy.heroHp <= 10">{{ s.enemy.heroHp }}</div>
            <div class="mana-row">
              @for (i of manaGems(s.enemy.manaMax); track $index) {
                <span class="mana-gem" [class.filled]="$index < s.enemy.mana"></span>
              }
            </div>
          </div>
          <div class="board">
            @for (m of s.enemy.board; track m.instanceId) {
              <div class="minion" [class.taunt]="m.isTaunt" [style.--el]="elementColor(m.element)">
                <span class="minion-name">{{ m.name }}</span>
                <span class="minion-stats mono">{{ m.attack }} / {{ m.health }}</span>
                @if (m.isTaunt) { <span class="minion-keyword">TAUNT</span> }
              </div>
            }
            @if (s.enemy.board.length === 0) {
              <div class="board-empty">No minions</div>
            }
          </div>
          <div class="hand enemy-hand">
            @for (i of [].constructor(enemyHandCount()); track $index) {
              <div class="card-back"></div>
            }
          </div>
        </div>

        <!-- Battle log -->
        <div class="log" #logEl>
          @for (e of s.log; track $index) {
            <div class="log-line" [class.player]="e.actor === 'player'">
              <span class="log-turn mono">T{{ e.turn }}</span>
              {{ e.text }}
            </div>
          }
        </div>

        <!-- Player zone -->
        <div class="zone player-zone">
          <div class="hand">
            @for (card of s.player.hand; track $index) {
              <button class="hand-card" [class.unaffordable]="card.cost > s.player.mana"
                      [style.--el]="elementColor(card.element)" [style.--rarity]="rarityColor(card.rarity)"
                      (click)="playCard($index)" [disabled]="s.phase !== 'player' || card.cost > s.player.mana"
                      [attr.aria-label]="'Play ' + card.name">
                <span class="hc-cost mono">{{ card.cost }}</span>
                <span class="hc-name">{{ card.name }}</span>
                <span class="hc-glyph">{{ glyph(card.element) }}</span>
                <span class="hc-stats mono">{{ card.attack }}/{{ card.health }}</span>
              </button>
            }
          </div>
          <div class="board">
            @for (m of s.player.board; track m.instanceId) {
              <div class="minion player-minion" [class.taunt]="m.isTaunt" [class.can-attack]="m.canAttack"
                   [class.selected]="selectedMinion() === m.instanceId"
                   [style.--el]="elementColor(m.element)"
                   (click)="onMinionClick(m)">
                <span class="minion-name">{{ m.name }}</span>
                <span class="minion-stats mono">{{ m.attack }} / {{ m.health }}</span>
                @if (m.canAttack) { <span class="minion-keyword">READY</span> }
                @if (m.isTaunt) { <span class="minion-keyword">TAUNT</span> }
              </div>
            }
            @if (s.player.board.length === 0) {
              <div class="board-empty">No minions</div>
            }
          </div>
          <div class="zone-head player-head">
            <div class="mana-row">
              @for (i of manaGems(s.player.manaMax); track $index) {
                <span class="mana-gem" [class.filled]="$index < s.player.mana"></span>
              }
            </div>
            <div class="hero-hp" [class.low]="s.player.heroHp <= 10">{{ s.player.heroHp }}</div>
            <span class="hero-name">{{ auth.currentUser()?.username ?? 'You' }}</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="controls">
          <button class="btn btn-ghost" routerLink="/battle">Forfeit</button>
          <button class="btn btn-secondary" [disabled]="s.phase !== 'player'" (click)="endTurn()">End turn →</button>
        </div>
      }

      @if (isOver()) {
        <div class="result-overlay">
          <div class="result-card" [class.victory]="state()?.phase === 'victory'">
            <div class="result-icon">{{ state()?.phase === 'victory' ? '🏆' : state()?.phase === 'defeat' ? '💀' : '🤝' }}</div>
            <h2>{{ state()?.phase === 'victory' ? 'Victory!' : state()?.phase === 'defeat' ? 'Defeat' : 'Draw' }}</h2>
            <p class="result-sub">Rewards have been credited to your account.</p>
            <div class="flex gap-sm" style="justify-content: center; margin-top: var(--space-md);">
              <a routerLink="/battle" class="btn btn-primary">Battle again</a>
              <a routerLink="/history" class="btn btn-ghost">History</a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .arena {
      min-height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      padding: var(--space-md);
      gap: var(--space-md);
      position: relative;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.06), transparent 55%),
        radial-gradient(ellipse at 50% 100%, rgba(239, 68, 68, 0.06), transparent 55%),
        var(--color-background);
    }
    .turn-banner {
      align-self: center;
      padding: 6px 20px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
      font-size: 0.875rem;
      letter-spacing: 0.04em;
      box-shadow: var(--shadow-md);
    }
    .turn-banner.enemy { background: var(--color-secondary); }
    .turn-banner.done { background: var(--color-text-muted); }
    .zone {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .zone-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
    }
    .player-head { margin-top: var(--space-sm); }
    .hero-name { font-weight: 700; }
    .hero-hp {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 1.375rem;
      color: var(--color-success);
    }
    .hero-hp.low { color: var(--color-danger); }
    .mana-row { display: flex; gap: 4px; }
    .mana-gem {
      width: 12px;
      height: 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
      background: var(--color-surface-secondary);
    }
    .mana-gem.filled {
      background: radial-gradient(circle at 35% 30%, #60A5FA, #1D4ED8);
      border-color: #1D4ED8;
    }
    .board {
      display: flex;
      justify-content: center;
      gap: var(--space-md);
      min-height: 92px;
      align-items: center;
      flex-wrap: wrap;
    }
    .minion {
      width: 88px;
      height: 92px;
      border-radius: var(--radius-md);
      border: 2px solid color-mix(in srgb, var(--el) 55%, var(--color-border));
      background: linear-gradient(170deg, color-mix(in srgb, var(--el) 22%, var(--color-surface)), var(--color-surface));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      cursor: pointer;
      transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
      position: relative;
    }
    .minion:hover { transform: translateY(-3px); }
    .minion.can-attack { box-shadow: 0 0 0 2px var(--color-accent); }
    .minion.selected { outline: 3px solid var(--color-primary); outline-offset: 2px; }
    .minion.taunt { border-style: dashed; }
    .minion-name { font-size: 0.688rem; font-weight: 700; text-align: center; line-height: 1.2; }
    .minion-stats { font-size: 0.875rem; font-weight: 700; }
    .minion-keyword {
      font-size: 0.5rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--el);
      position: absolute;
      top: 3px;
      right: 5px;
    }
    .board-empty { color: var(--color-text-muted); font-size: 0.813rem; }
    .hand {
      display: flex;
      justify-content: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
      min-height: 96px;
      align-items: center;
    }
    .hand-card {
      width: 84px;
      aspect-ratio: 5 / 7;
      border-radius: var(--radius-md);
      border: 2px solid var(--rarity);
      background: var(--color-surface);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px;
      cursor: pointer;
      color: var(--color-text);
      transition: transform var(--duration-fast) var(--ease-out);
      position: relative;
    }
    .hand-card:hover:not(:disabled) { transform: translateY(-6px); }
    .hand-card:disabled { cursor: not-allowed; }
    .hand-card.unaffordable { opacity: 0.5; filter: grayscale(0.6); }
    .hc-cost {
      position: absolute;
      top: 3px;
      left: 4px;
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--color-primary);
    }
    .hc-name { font-size: 0.625rem; font-weight: 700; text-align: center; margin-top: 10px; }
    .hc-glyph { font-size: 1.25rem; margin-top: auto; }
    .hc-stats { font-size: 0.75rem; font-weight: 800; }
    .card-back {
      width: 60px;
      height: 84px;
      border-radius: var(--radius-md);
      background: repeating-linear-gradient(45deg, #1E293B, #1E293B 6px, #334155 6px, #334155 12px);
      border: 2px solid #475569;
    }
    .enemy-hand { min-height: 84px; }
    .log {
      max-height: 130px;
      overflow-y: auto;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.75rem;
    }
    .log-line { color: var(--color-text-muted); }
    .log-line.player { color: var(--color-text); }
    .log-turn { color: var(--color-accent); font-weight: 700; margin-right: 6px; }
    .controls {
      display: flex;
      justify-content: center;
      gap: var(--space-md);
      padding-bottom: var(--space-lg);
    }
    .result-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg);
    }
    .result-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-2xl);
      text-align: center;
      max-width: 420px;
      width: 100%;
      border-top: 6px solid var(--color-danger);
    }
    .result-card.victory { border-top-color: var(--color-success); }
    .result-icon { font-size: 3rem; }
    .result-sub { color: var(--color-text-muted); }
  `]
})
export class BattleArenaPage {
  private battlesService = inject(BattlesService);
  protected auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly state = signal<BattleState | null>(null);
  readonly selectedMinion = signal<string | null>(null);
  readonly attacking = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('battleId');
    if (id) this.load(id);
  }

  private async load(id: string) {
    try {
      this.state.set(await this.battlesService.getBattle(id));
    } catch {
      this.router.navigate(['/battle']);
    }
  }

  bannerText(): string {
    const s = this.state();
    if (!s) return 'Loading…';
    switch (s.phase) {
      case 'player': return '⚔ Your turn';
      case 'enemy': return '🤖 Enemy turn';
      case 'victory': return '🏆 Victory';
      case 'defeat': return '💀 Defeat';
      case 'draw': return '🤝 Draw';
      default: return '';
    }
  }

  isOver(): boolean {
    const p = this.state()?.phase;
    return p === 'victory' || p === 'defeat' || p === 'draw';
  }

  manaGems(max: number): number[] {
    return Array(Math.min(max, 10)).fill(0);
  }

  enemyHandCount(): number {
    return this.state()?.enemy.hand.length ?? 0;
  }

  async playCard(handIndex: number) {
    const s = this.state();
    if (!s || s.phase !== 'player') return;
    const card = s.player.hand[handIndex];
    if (!card || card.cost > s.player.mana) return;
    this.attacking.set(true);
    try {
      const next = await this.battlesService.playCard(s.battleId, card.id);
      this.state.set(next);
      this.selectedMinion.set(null);
    } finally {
      this.attacking.set(false);
    }
  }

  onMinionClick(m: Minion) {
    const s = this.state();
    if (!s || s.phase !== 'player') return;
    const sel = this.selectedMinion();
    if (sel === m.instanceId) {
      this.selectedMinion.set(null);
      return;
    }
    if (sel) {
      // Attacking an enemy minion with the selected one
      this.doAttack(sel, m.instanceId);
      return;
    }
    // Selecting own minion to attack with
    const isOwn = s.player.board.some((b) => b.instanceId === m.instanceId);
    if (isOwn && m.canAttack) {
      this.selectedMinion.set(m.instanceId);
      return;
    }
    // No selected minion + clicked enemy minion = attack with first ready minion
    const ready = s.player.board.find((b) => b.canAttack);
    if (ready && !isOwn) {
      this.doAttack(ready.instanceId, m.instanceId);
    }
  }

  private async doAttack(attackerId: string, targetId: string) {
    const s = this.state();
    if (!s || this.attacking()) return;
    this.attacking.set(true);
    try {
      const next = await this.battlesService.attack(s.battleId, attackerId, targetId);
      this.state.set(next);
      this.selectedMinion.set(null);
    } finally {
      this.attacking.set(false);
    }
  }

  async attackHero() {
    const s = this.state();
    if (!s || s.phase !== 'player') return;
    const sel = this.selectedMinion();
    if (!sel) return;
    this.attacking.set(true);
    try {
      const next = await this.battlesService.attack(s.battleId, sel, 'hero');
      this.state.set(next);
      this.selectedMinion.set(null);
    } finally {
      this.attacking.set(false);
    }
  }

  async endTurn() {
    const s = this.state();
    if (!s || s.phase !== 'player') return;
    this.attacking.set(true);
    try {
      const next = await this.battlesService.endTurn(s.battleId);
      this.state.set(next);
      this.selectedMinion.set(null);
      await this.auth.getMe();
    } finally {
      this.attacking.set(false);
    }
  }

  elementColor(element: string): string {
    const colors: Record<string, string> = {
      ember: '#EF4444', tide: '#3B82F6', thorn: '#22C55E', shadow: '#8B5CF6', storm: '#06B6D4',
    };
    return colors[element] ?? '#94A3B8';
  }

  rarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#94A3B8', rare: '#3B82F6', epic: '#8B5CF6', legendary: '#F59E0B',
    };
    return colors[rarity] ?? '#94A3B8';
  }

  glyph(element: string): string {
    const glyphs: Record<string, string> = {
      ember: '🔥', tide: '💧', thorn: '🌿', shadow: '🌑', storm: '⚡',
    };
    return glyphs[element] ?? '🃏';
  }
}
