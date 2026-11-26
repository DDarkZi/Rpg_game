/* 기술 연구(넥서스에서 하나씩). tier는 넥서스 레벨이 있어야 열림. fx: 효과 */
'use strict';
const TECH = {
  armor1: { n: '강화 판금', tier: 1, cost: { A: 100 }, time: 18, d: '모든 유닛 방어력 +1', fx: { unitArmor: 1 } },
  aim: { n: '정밀 조준', tier: 1, cost: { A: 100, B: 25 }, time: 18, d: '원거리·공성 유닛 공격력 +15%', fx: { rangedAtkPct: 15 } },
  mining: { n: '효율 채집', tier: 1, cost: { A: 75 }, time: 15, d: '일꾼이 루멘을 1 더 운반', fx: { carryA: 1 } },
  steam: { n: '증기 공학', tier: 2, cost: { A: 150, B: 75 }, time: 22, d: '증기 포병 생산 해금', fx: {} },
  logistics: { n: '보급 체계', tier: 2, cost: { A: 100, B: 50 }, time: 18, d: '일꾼 최대 수 +4', fx: { workerCap: 4 } },
  towerup: { n: '수호탑 개량', tier: 2, cost: { A: 125, B: 75 }, time: 20, d: '수호탑 공격력 +40%, 사거리 +1', fx: { turretAtkPct: 40, turretRange: 1 } },
  resolve: { n: '불굴의 결의', tier: 3, cost: { A: 200, B: 150 }, time: 28, d: '모든 유닛 체력 +20%', fx: { unitHpPct: 20 } },
  amp: { n: '아르카 증폭', tier: 3, cost: { A: 150, B: 150 }, time: 28, d: '아르카 파동 피해 ×1.5, 에너지 충전 +50%', fx: { waveMul: .5, energyPct: 50 } }
};
/* 시너지: 배치된 유닛 수로 발동 */
const SYNERGIES = [
  { k: 'race:iron', n: '철성 연합', ic: '⚙️', tiers: [{ n: 2, fx: { hpPct: 10 }, d: '체력 +10%' }, { n: 4, fx: { hpPct: 20, atkPct: 10 }, d: '체력 +20%, 공격력 +10%' }] },
  { k: 'race:bansuk', n: '반석 기사단', ic: '🗿', tiers: [{ n: 1, fx: { armor: 2 }, d: '모든 유닛 방어력 +2' }] },
  { k: 'role:tank', n: '수호', ic: '🛡', tiers: [{ n: 2, fx: { armor: 2 }, only: 'tank', d: '탱커 방어력 +2' }] },
  { k: 'role:ranged', n: '사격', ic: '🏹', tiers: [{ n: 2, fx: { asPct: 15 }, only: 'ranged', d: '원거리 공격 속도 +15%' }, { n: 3, fx: { asPct: 30 }, only: 'ranged', d: '원거리 공격 속도 +30%' }] },
  { k: 'role:melee', n: '돌격', ic: '⚔️', tiers: [{ n: 2, fx: { atkPct: 15 }, only: 'melee', d: '근접 공격력 +15%' }] }
];
/* 웨이브 사이 보상 카드(3장 중 1장) */
const BOONS = {
  supply: { n: '보급품', ic: '📦', d: '루멘 +150', fx: { A: 150 } },
  essence: { n: '정수 결정', ic: '💜', d: '정수 +60', fx: { B: 60 } },
  repair: { n: '긴급 수리', ic: '🔧', d: '넥서스 체력 30% 회복, 건물 모두 수리', fx: { repair: 1 } },
  drill: { n: '훈련', ic: '🎯', d: '이번 스테이지 동안 유닛 공격력 +10%', fx: { atkPct: 10 } },
  plating: { n: '덧댄 장갑', ic: '🧱', d: '이번 스테이지 동안 유닛 방어력 +1', fx: { armor: 1 } },
  overclock: { n: '과부하', ic: '⚡', d: '이번 스테이지 동안 수호탑 공격 속도 +20%', fx: { turretAsPct: 20 } }
};
/* 영구 성장(스테이지 클리어 포인트로) — 너무 세지지 않게 최대 3단계 */
const META = {
  startA: { n: '시작 루멘', d: '스테이지 시작 루멘 +50', max: 3, per: 50 },
  mine: { n: '일꾼 효율', d: '일꾼 채집 속도 +6%', max: 3, per: 6 },
  nexusHp: { n: '넥서스 강화', d: '넥서스 체력 +8%', max: 3, per: 8 }
};
