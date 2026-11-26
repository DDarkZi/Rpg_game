/* 스테이지 데이터. map: 9칸 × 13줄 (글자는 core.js TILES)
   waves: [{ g:[{e:적, n:마리, every:간격초, delay:시작 지연, sp:출현 지점 번호(-1=무작위)}], reward:{A,B} }] */
'use strict';
const REGIONS = [
  { id: 'r1', n: '잿빛 협곡', d: '철성 연합의 마지막 광맥. 군체의 첫 침공로.', stages: ['s1', 's2', 's3'], ready: true },
  { id: 'r2', n: '결정 동굴', d: '화강 결정족의 땅', stages: [], ready: false },
  { id: 'r3', n: '천둥 평원', d: '거수 부족의 땅', stages: [], ready: false }
];
const STAGES = {
  s1: { n: 'STAGE 01 · 협곡 입구', region: 'r1', start: { A: 200, B: 0 }, prep: 45, between: 20,
    map: ['###.S.###', '##.....##', '#...#...#', '..+...+..', '.#.....#.', '....m....', '.^.....^.', '..#...#..', '.........', 'a..d.d..v', 'a...N...a', 'a.......#', '#########'],
    waves: [
      { g: [{ e: 'gnaw', n: 8, every: 1.6 }], reward: { A: 80, B: 20 } },
      { g: [{ e: 'gnaw', n: 10, every: 1.3 }, { e: 'shell', n: 2, every: 6, delay: 5 }], reward: { A: 100, B: 30 } },
      { g: [{ e: 'gnaw', n: 14, every: 1 }, { e: 'shell', n: 4, every: 4.5, delay: 4 }, { e: 'stinger', n: 4, every: 3, delay: 9 }], reward: { A: 120, B: 40 } }
    ],
    intro: [{ w: '총독 하린', t: '군체가 협곡 입구까지 왔어. 넥서스가 꺼지면 벨크하운은 끝이야.' },
      { w: '총독 하린', t: '먼저 일꾼으로 루멘을 캐고, 병영을 지어 병력을 뽑자. 정수 분출구엔 추출기를 세워야 정수를 캘 수 있어.' },
      { w: '총독 하린', t: '유닛은 어디에 세우느냐가 전부야. 방패는 앞, 소총은 뒤. 준비되면 웨이브를 시작해.' }],
    outro: [{ w: '총독 하린', t: '버텼다! …그런데 저 벌레들, 처음 보는 놈들이 섞여 있었어. 더 깊은 곳에서 오고 있어.' }],
    unlock: { lore: ['arca', 'nexus'] } },
  s2: { n: 'STAGE 02 · 갈라진 능선', region: 'r1', start: { A: 250, B: 50 }, prep: 40, between: 20,
    map: ['S.#####.S', '..#...#..', '...m.m...', '.#..+..#.', '....#....', '.^.....^.', '..m...m..', '.........', '#.d...d.#', 'v.......a', 'a...N...a', 'a.......v', '#########'],
    waves: [
      { g: [{ e: 'gnaw', n: 16, every: 1 }, { e: 'spore', n: 6, every: 2.5, delay: 6 }, { e: 'shell', n: 2, every: 6, delay: 4 }], reward: { A: 100, B: 40 } },
      { g: [{ e: 'gnaw', n: 16, every: .9 }, { e: 'acid', n: 4, every: 4.5, delay: 6 }, { e: 'spore', n: 6, every: 2.5, delay: 3 }, { e: 'shell', n: 4, every: 5, delay: 2 }, { e: 'stinger', n: 3, every: 3, delay: 10 }], reward: { A: 120, B: 50 } },
      { g: [{ e: 'gnaw', n: 20, every: .8 }, { e: 'shell', n: 6, every: 4 }, { e: 'stinger', n: 6, every: 2.5, delay: 8 }, { e: 'spore', n: 9, every: 2, delay: 4 }, { e: 'acid', n: 4, every: 4, delay: 10 }], reward: { A: 150, B: 60 } }
    ],
    intro: [{ w: '정찰병 리나', t: '총독님! 하늘에서도 와요! 날개 달린 포자예요!' },
      { w: '총독 하린', t: '소총병과 수호탑은 하늘도 쏠 수 있어. 공중 대비를 잊지 마.' },
      { w: '대석공 몬드', t: '…철성의 아이야. 우리 결정족도 이 땅을 지키겠다. 옛 계약대로.' }],
    outro: [{ w: '대석공 몬드', t: '우리 둘의 힘을 합치자. 결정과 강철이 하나가 되면, 반석이 된다.' },
      { w: '총독 하린', t: '혼성 종족 「반석 기사단」이 공명했어! 이제 골렘을 부를 수 있어.' }],
    unlock: { hybrid: ['bansuk'], lore: ['rift', 'resonance'] } },
  s3: { n: 'BOSS · 군체의 심장', region: 'r1', boss: true, start: { A: 300, B: 100 }, prep: 45, between: 22,
    map: ['S...S...S', '.........', '.#.#.#.#.', '..+...+..', '....m....', '.^..#..^.', '.........', '..d...d..', '#.......#', 'a.......v', 'a...N...a', 'v.......a', '#########'],
    waves: [
      { g: [{ e: 'gnaw', n: 16, every: .9 }, { e: 'spore', n: 6, every: 2.5, delay: 4 }, { e: 'stinger', n: 3, every: 3, delay: 8 }], reward: { A: 130, B: 50 } },
      { g: [{ e: 'shell', n: 6, every: 3.5 }, { e: 'acid', n: 4, every: 4, delay: 6 }, { e: 'gnaw', n: 12, every: 1, delay: 2 }], reward: { A: 150, B: 60 } },
      { g: [{ e: 'gnaw', n: 18, every: .8 }, { e: 'shell', n: 5, every: 4 }, { e: 'stinger', n: 6, every: 2.5, delay: 6 }, { e: 'spore', n: 8, every: 2, delay: 3 }, { e: 'acid', n: 4, every: 4, delay: 10 }], reward: { A: 180, B: 80 } },
      { g: [{ e: 'brood', n: 1, every: 1, sp: 1 }, { e: 'gnaw', n: 10, every: 1.5, delay: 3 }, { e: 'spore', n: 6, every: 3, delay: 8 }], reward: { A: 0, B: 0 } }
    ],
    intro: [{ w: '총독 하린', t: '저기 봐. 협곡 끝에 거대한 알집이… 군체 모후야.' },
      { w: '대석공 몬드', t: '모후만 쓰러뜨리면 군체는 흩어진다. 버텨라, 반석처럼.' }],
    outro: [{ w: '군체 모후', t: '…끼이… 아르카는… 우리를 부른다… 균열 너머에서… 더 많은 우리가…' },
      { w: '총독 하린', t: '「아르카가 부른다」고? …이 전쟁, 군체가 시작한 게 아닐지도 몰라.' },
      { t: '— 잿빛 협곡을 되찾았다. 다음 지역은 아직 준비 중이에요. —' }],
    unlock: { lore: ['firstwar', 'swarm'] } }
};
/* 세계관 이야기(스테이지를 깰수록 하나씩 공개) */
const LORE = {
  arca: { n: '아르카', t: '세계 한가운데에서 솟는 거대한 에너지. 모든 종족은 아르카를 먹고 마시고 태우며 살아간다. 누가 아르카를 차지하느냐가 곧 누가 살아남느냐다.' },
  nexus: { n: '넥서스', t: '아르카를 담아 두는 거대한 그릇. 종족마다 모양은 달라도, 넥서스가 꺼지면 그 땅의 아르카도 흩어진다.' },
  rift: { n: '대균열', t: '하늘이 찢어지고 포자가 쏟아진 날. 아무도 그 이유를 모른다고들 하지만, 몇몇 종족은 무언가를 숨기고 있다.' },
  resonance: { n: '공명', t: '서로 다른 두 종족이 같은 넥서스를 지킬 때, 아르카가 두 힘을 하나로 엮는다. 그렇게 태어난 것이 혼성 종족이다. 스물여덟 가지 공명이 가능하다고 전해진다.' },
  firstwar: { n: '첫 공명 전쟁', t: '오래전 여덟 종족이 아르카를 두고 벌인 전쟁. 그 끝에 일어난 대폭발이 망령단을 만들고, 어쩌면 균열까지 불렀다.' },
  swarm: { n: '부르는 소리', t: '군체 모후는 마지막에 말했다. "아르카가 우리를 부른다." 군체는 침략자일까, 아니면 부름에 답한 손님일까.' }
};
