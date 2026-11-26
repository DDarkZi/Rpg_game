/* 기본 데이터: 자원 2종 · 타일 · 피해 상성 · 난이도 */
'use strict';
/* 재화는 정확히 2종류 */
const RES = {
  A: { n: '루멘', ic: '🔷', col: '#7dd3fc', d: '기본 자원. 일꾼·기본 건물·기본 유닛·일부 강화에 써요.' },
  B: { n: '정수', ic: '🟣', col: '#c084fc', d: '아르카 정수. 고급 건물·고급 유닛·기술 연구·넥서스 강화·특수 능력에 써요. 정수 추출기가 있어야 캘 수 있어요.' }
};
/* 지도 글자 → 타일. walk 걷기 · build 건물 · place 유닛 배치 · bonus 배치 보너스 · slow 적 이동 감속 */
const TILES = {
  '.': { k: 'plain', n: '평지', walk: 1, build: 1, place: 1, col: '#27324a' },
  '#': { k: 'rock', n: '바위(막힘)', col: '#141826' },
  'S': { k: 'spawn', n: '적 출현 지점', walk: 1, col: '#4a1f2c' },
  'N': { k: 'nexus', n: '넥서스', col: '#1d3a5f' },
  'a': { k: 'resA', n: '루멘 광맥', col: '#1e4a63', res: 'A' },
  'v': { k: 'vent', n: '정수 분출구', col: '#3b2556', res: 'B', buildOnly: 'extractor' },
  '+': { k: 'atk', n: '공격 타일', walk: 1, build: 1, place: 1, col: '#4a2b2b', bonus: { atkPct: 20 }, d: '여기 배치한 유닛 공격력 +20%' },
  'd': { k: 'def', n: '방어 타일', walk: 1, build: 1, place: 1, col: '#22413a', bonus: { armor: 3 }, d: '여기 배치한 유닛 방어력 +3' },
  '^': { k: 'high', n: '고지대', walk: 1, build: 1, place: 1, col: '#3d3a26', bonus: { range: 1 }, d: '원거리 유닛 사거리 +1' },
  'm': { k: 'mud', n: '진흙(디버프)', walk: 1, place: 1, col: '#3a2f22', slow: .5, d: '지나가는 적이 느려져요(50%)' }
};
/* 공격 타입 × 방어 타입 배율 (magic은 방어력 무시) */
const DMG_MULT = {
  normal: { light: 1, heavy: 1, structure: .8 },
  pierce: { light: 1.2, heavy: .8, structure: .6 },
  siege: { light: .8, heavy: 1, structure: 1.6 },
  magic: { light: 1, heavy: 1, structure: .5 }
};
const DIFFS = {
  N: { n: 'NORMAL', ko: '보통', hp: 1, atk: 1, spawn: 1, startA: 1, pts: 1 },
  H: { n: 'HARD', ko: '어려움', hp: 1.2, atk: 1.15, spawn: .9, startA: 1, pts: 2 },
  X: { n: 'NIGHTMARE', ko: '악몽', hp: 1.45, atk: 1.3, spawn: .8, startA: .85, pts: 3 }
};
/* 일꾼 */
const WORKER = { cost: { A: 50 }, time: 5, speed: 2.2, carry: { A: 5, B: 4 }, gather: 1.5, cap: 8, start: 4 };
