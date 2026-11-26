/* 건물 데이터. foot: 차지하는 칸 수(지금은 1) · needTile: 특정 타일에만 · produces: 생산 유닛 */
'use strict';
const BUILDINGS = {
  barracks: { n: '병영', ic: '🏰', cost: { A: 150 }, time: 18, hp: 900, armor: 2, armorType: 'structure', foot: 1, produces: ['shield', 'sword', 'rifle', 'medic', 'cannon', 'golem'], d: '유닛을 생산해요(대기열 5)' },
  extractor: { n: '정수 추출기', ic: '⛽', cost: { A: 75 }, time: 12, hp: 500, armor: 2, armorType: 'structure', foot: 1, needTile: 'vent', d: '정수 분출구 위에만 지어요. 있어야 일꾼이 정수를 캐요' },
  turret: { n: '수호탑', ic: '🗼', cost: { A: 100 }, time: 14, hp: 700, armor: 3, armorType: 'structure', foot: 1, atk: 18, as: 1.2, range: 3, air: true, atkType: 'pierce', d: '자동 방어탑. 공중도 쏴요' }
};
/* 넥서스 레벨. ready:false 는 아직 준비 중 */
const NEXUS = {
  atk: 12, as: 1, range: 2, armor: 3, energyMax: 100, energyRegen: 2, wave: { dmg: 150, radius: 3, shield: 150 },
  lv: [null,
    { hp: 2000, sh: 400, ready: true, d: '기본 유닛' },
    { hp: 2600, sh: 600, cost: { A: 200, B: 100 }, time: 20, ready: true, d: '2단계 기술·고급 유닛 해금' },
    { hp: 3200, sh: 800, cost: { A: 350, B: 200 }, time: 30, ready: true, d: '3단계 기술 해금' },
    { hp: 3800, sh: 1000, cost: { A: 500, B: 350 }, time: 40, ready: false, d: '종족 궁극기 (준비 중)' },
    { hp: 4600, sh: 1200, cost: { A: 800, B: 600 }, time: 50, ready: false, d: '최종 기술 (준비 중)' }]
};
