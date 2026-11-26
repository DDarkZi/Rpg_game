/* 공명 전쟁 — 데이터 (종족·타워·유닛). 규칙(엔진)은 engine.js, 그림은 sprites.js */
'use strict';
const COLS = 7, ROWS = 10, SPAWN_X = 3, N_PL = 8;
const TICK = 10, START_GOLD = 500, START_INC = 30, START_LIFE = 100, KR = .3, RESON_T = 90;
const D4 = [[0, 1], [1, 0], [-1, 0], [0, -1]];
const PC = ['#38bdf8', '#f472b6', '#facc15', '#4ade80', '#fb923c', '#c084fc', '#f87171', '#2dd4bf'];

/* 8종족. play:false 는 아직 만드는 중(제목 화면에서 '준비 중') */
const RACES = {
  human:  { n: '인간',   ic: '🧑', col: '#60a5fa', tag: '보급', play: true,
    d: '땅을 잃었지만 기술과 상술이 있어요. 수입을 늘리고 튼튼하게 버텨요.', weak: '특출난 화력이 없어요' },
  magic:  { n: '마법',   ic: '🔮', col: '#a78bfa', tag: '폭발', play: false,
    d: '순간 화력이 최고예요. 범위 공격과 원소의 힘.', weak: '단일 대상에 약해요' },
  machine:{ n: '기계',   ic: '⚙️', col: '#94a3b8', tag: '장갑·연사', play: true,
    d: '주인 잃은 기계들. 튼튼한 장갑과 빠른 연사.', weak: '비싸고 느려요' },
  insect: { n: '곤충',   ic: '🐛', col: '#84cc16', tag: '물량·독', play: true,
    d: '여왕의 부름으로 몰려드는 작은 군단. 독과 끈끈이.', weak: '하나하나는 약해요' },
  alien:  { n: '외계',   ic: '👽', col: '#22d3ee', tag: '공간·시간', play: false,
    d: '순간이동과 감속, 관통 광선. 대균열을 만든 장본인이라는 의심을 받아요.', weak: '효과가 가끔 불안정해요' },
  animal: { n: '동물',   ic: '🐺', col: '#f59e0b', tag: '돌진·재생', play: false,
    d: '크고 튼튼한 소수 정예. 빠르게 돌진하고 스스로 회복해요.', weak: '사거리가 짧아요' },
  elf:    { n: '엘프',   ic: '🧝', col: '#34d399', tag: '사거리·속박', play: false,
    d: '부서진 숲을 지키는 저격수들. 멀리서 쏘고 뿌리로 묶어요.', weak: '근접하면 약해요' },
  undead: { n: '언데드', ic: '💀', col: '#d6d3c4', tag: '부활·흡혈', play: false,
    d: '쓰러져도 돌아오는 죽음의 종족. 저주와 흡혈.', weak: '느리고 신성에 약해요' }
};
const RK = Object.keys(RACES);

/* 타워: r 종족(0개=공용, 1개=단일, 2개=조합) · c 가격 · d 공격력 · rng 사거리(칸) · cd 간격(초)
   t 공격 대상(G지상·A공중) · poison [초당,초] · slow [배율,초] · pierce 장갑 무시 비율 · shred 맞을 때마다 장갑 깎기
   gold 명중 때마다 골드 · inc 지으면 인컴 증가 */
const T = {
  wall:    { n: '바리케이드', r: [], c: 20, d: 0, shape: 'wall', x: '길을 막아 적이 돌아가게 해요(길을 완전히 막을 순 없어요)' },
  crossbow:{ n: '석궁탑', r: ['human'], c: 100, d: 24, rng: 3.2, cd: .8, t: 'GA', shape: 'turret' },
  market:  { n: '상인 부스', r: ['human'], c: 140, d: 0, inc: 4, shape: 'market', x: '공격은 안 하지만 인컴이 +4 늘어요' },
  mg:      { n: '기관총 터릿', r: ['machine'], c: 120, d: 9, rng: 3, cd: .22, t: 'GA', shape: 'turret2' },
  rail:    { n: '레일 포', r: ['machine'], c: 220, d: 90, rng: 4.2, cd: 1.6, t: 'G', pierce: 1, shape: 'rail' },
  sting:   { n: '독침 둥지', r: ['insect'], c: 100, d: 8, rng: 2.8, cd: .7, t: 'GA', poison: [6, 3], shape: 'nest' },
  web:     { n: '거미줄 틀', r: ['insect'], c: 110, d: 3, rng: 2.6, cd: 1, t: 'GA', slow: [.5, 1.6], shape: 'web' },
  hm:      { n: '철갑 포대', r: ['human', 'machine'], c: 200, d: 34, rng: 3.6, cd: .5, t: 'GA', pierce: .5, shape: 'turret' },
  hi:      { n: '양봉장', r: ['human', 'insect'], c: 170, d: 10, rng: 3, cd: .6, t: 'GA', poison: [5, 3], gold: 1, shape: 'nest' },
  mi:      { n: '부식 분사기', r: ['machine', 'insect'], c: 190, d: 6, rng: 2.8, cd: .15, t: 'G', shred: .4, shape: 'sprayer' }
};

/* 유닛: c 가격 · hp · sp 속도(칸/초) · air 공중 · dm 탈출 피해 · inc 보내면 인컴 증가 · armor 장갑 · count 한 번에 몇 마리 */
const U = {
  militia: { n: '민병', r: ['human'], c: 60, hp: 80, sp: 1.4, dm: 1, inc: 3, shape: 'foot' },
  knight:  { n: '기사', r: ['human'], c: 160, hp: 220, sp: 1.2, dm: 2, inc: 8, armor: 2, shape: 'knight' },
  drone:   { n: '정찰 드론', r: ['machine'], c: 110, hp: 90, sp: 1.8, dm: 1, inc: 6, air: 1, shape: 'drone' },
  tank:    { n: '철갑차', r: ['machine'], c: 200, hp: 300, sp: .9, dm: 3, inc: 9, armor: 4, shape: 'tank' },
  ant:     { n: '개미 떼', r: ['insect'], c: 40, hp: 40, sp: 1.7, dm: 1, inc: 2, count: 3, shape: 'bug', x: '한 번에 3마리' },
  dfly:    { n: '잠자리', r: ['insect'], c: 120, hp: 100, sp: 2, dm: 1, inc: 6, air: 1, shape: 'fly' },
  hmU:     { n: '증기 보병', r: ['human', 'machine'], c: 170, hp: 250, sp: 1.5, dm: 2, inc: 10, armor: 3, shape: 'foot' },
  hiU:     { n: '일벌 용병', r: ['human', 'insect'], c: 110, hp: 70, sp: 1.8, dm: 1, inc: 8, count: 2, shape: 'bug', x: '한 번에 2마리' },
  miU:     { n: '방패 딱정벌레', r: ['machine', 'insect'], c: 150, hp: 160, sp: 1.3, dm: 2, inc: 7, armor: 5, shape: 'beetle' }
};

const allowed = (d, a, b) => d.r.every(k => k === a || k === b);
const lateMul = t => t < 300 ? 1 : t < 480 ? 1.5 : t < 660 ? 2 : 3;
const comboName = (a, b) => RACES[a].n + '+' + RACES[b].n;
