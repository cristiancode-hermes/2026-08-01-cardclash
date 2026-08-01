import { Injectable } from '@nestjs/common';
import { BattleState, getValidAttackTargets } from './battle-engine';

export type Difficulty = 'apprentice' | 'veteran' | 'master';

export interface AiDecision {
  playHandIndex: number | null;
  attacks: { attackerInstanceId: string; targetInstanceId: string | 'hero' }[];
}

@Injectable()
export class AiOpponentService {
  chooseAction(state: BattleState, difficulty: Difficulty): AiDecision {
    const enemy = state.enemy;

    // Phase 1: play cards (highest-cost affordable first for veteran/master; random for apprentice)
    let playHandIndex: number | null = null;
    const playable: { index: number; cost: number }[] = [];
    enemy.hand.forEach((card, index) => {
      if (card.cost <= enemy.mana && enemy.board.length < 5) {
        playable.push({ index, cost: card.cost });
      }
    });

    if (playable.length > 0) {
      if (difficulty === 'apprentice') {
        const pick = playable[Math.floor(Math.random() * playable.length)];
        playHandIndex = pick.index;
      } else {
        // Prefer the most expensive card (and taunt cards for master)
        playable.sort((a, b) => {
          const aCard = enemy.hand[a.index];
          const bCard = enemy.hand[b.index];
          const aTaunt = aCard.ability === 'taunt' ? 100 : 0;
          const bTaunt = bCard.ability === 'taunt' ? 100 : 0;
          return b.cost + bTaunt - (a.cost + aTaunt);
        });
        playHandIndex = playable[0].index;
      }
    }

    // Phase 2: attacks
    const attacks: { attackerInstanceId: string; targetInstanceId: string | 'hero' }[] = [];
    const attackers = enemy.board.filter((m) => m.canAttack && m.health > 0);
    for (const attacker of attackers) {
      const valid = getValidAttackTargets(state, 'enemy');
      if (valid.minions.length === 0 && !valid.heroAvailable) break;

      let target: string | 'hero';
      if (valid.minions.length > 0) {
        // Attack weakest enemy minion first (veteran/master); random (apprentice)
        if (difficulty === 'apprentice') {
          const pick = valid.minions[Math.floor(Math.random() * valid.minions.length)];
          target = pick.instanceId;
        } else {
          const weakest = [...valid.minions].sort((a, b) => a.health - b.health)[0];
          target = weakest.instanceId;
        }
      } else {
        target = 'hero';
      }
      attacks.push({ attackerInstanceId: attacker.instanceId, targetInstanceId: target });
    }

    return { playHandIndex, attacks };
  }
}
