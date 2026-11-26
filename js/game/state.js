/* 전투 상태 만들기 + 능력치 계산(기술·시너지·타일·보상 카드). 화면 코드 없음(노드에서 시뮬 가능) */
'use strict';
let B = null;
const BENCH_MAX = 8, QUEUE_MAX = 5, LEASH = 3;

/* meta: 영구 성장 단계 {startA, mine, nexusHp} · hybrid: 쓸 혼성 종족 id 또는 null */
function newBattle(stageId, diff, opt = {}) {
  const st = STAGES[stageId], D = DIFFS[diff], meta = opt.meta || {};
  HEX.setup(st.map[0].length, st.map.length);
  const tiles = [], spawns = [], nodes = [];
  let nexusCell = -1;
  st.map.forEach((row, r) => [...row].forEach((ch, c) => {
    const id = r * HEX.W + c, t = TILES[ch] || TILES['#']; tiles.push(t);
    if (t.k === 'spawn') spawns.push(id); if (t.k === 'nexus') nexusCell = id;
    if (t.res) nodes.push({ cell: id, res: t.res, user: null, active: t.res === 'A' });
  }));
  B = { sid: stageId, st, diff, D, meta, t: 0, phase: 'prep', prepT: st.prep, wave: -1, waveT: 0, spawnQ: [],
    tiles, spawns, nodes, nexusCell, occ: new Array(HEX.N).fill(null), bld: new Array(HEX.N).fill(null),
    res: { A: Math.round(st.start.A * D.startA) + (meta.startA || 0) * META.startA.per, B: st.start.B },
    units: [], bench: [], enemies: [], air: [], blds: [], workers: [], wq: 0, wqT: 0, wantB: 0,
    techDone: {}, fx0: {}, research: null, nexusUp: null, mods: { atkPct: 0, armor: 0, turretAsPct: 0 },
    boonChoice: null, hybrid: opt.hybrid || null, ultCd: 0, fx: [], log: [], uid: 0, flow: null, flowDirty: true,
    syn: [], stats: { kills: 0, lost: 0, built: 0, spent: 0 }, result: null, lastHit: -99, sim: !!opt.sim };
  /* 넥서스 */
  const lv1 = NEXUS.lv[1], nhp = lv1.hp * (1 + (meta.nexusHp || 0) * META.nexusHp.per / 100) * hybHp();
  const nx = { uid: ++B.uid, kind: 'bld', id: 'nexus', def: { n: '넥서스', ic: '💠', armorType: 'structure' }, cell: nexusCell, hp: nhp, mhp: nhp,
    sh: lv1.sh, msh: lv1.sh, lv: 1, done: true, cd: 0, energy: 0, team: 'p' };
  B.nexus = nx; B.blds.push(nx); B.bld[nexusCell] = nx;
  for (let i = 0; i < WORKER.start; i++) addWorker();
  techRecalc(); refreshStats();
  say(`${st.n} — 준비 ${st.prep}초. 웨이브 ${st.waves.length}개를 막으면 승리!`);
  return B;
}
const hybHp = () => B && B.hybrid === 'bansuk' ? 1.25 : 1;
function say(m, k) { B.log.push({ t: B.t, m, k: k || '' }); if (B.log.length > 40) B.log.shift() }
const tileOf = id => B.tiles[id];
const spawnDist = id => Math.min(...B.spawns.map(s => HEX.dist(s, id)));
/* 기술 효과 합치기 */
function techRecalc() {
  const f = {}; for (const k in B.techDone) for (const [x, v] of Object.entries(TECH[k].fx)) f[x] = (f[x] || 0) + v;
  B.fx0 = f;
}
const workerCap = () => WORKER.cap + (B.fx0.workerCap || 0);
/* 시너지 + 유닛 능력치 다시 계산(배치·기술·보상이 바뀔 때마다) */
function refreshStats() {
  const cnt = {};
  for (const u of B.units) { cnt['race:' + u.def.race] = (cnt['race:' + u.def.race] || 0) + 1; cnt['role:' + u.def.role] = (cnt['role:' + u.def.role] || 0) + 1 }
  B.syn = SYNERGIES.map(s => { const c = cnt[s.k] || 0; let tier = null; for (const t of s.tiers) if (c >= t.n) tier = t; return { s, c, tier } });
  const f = B.fx0, m = B.mods;
  for (const u of B.units.concat(B.bench)) {
    const d = u.def, tb = (u.home >= 0 && B.tiles[u.home].bonus) || {}, rangedish = d.role === 'ranged' || d.role === 'siege';
    let hpPct = f.unitHpPct || 0, atkPct = m.atkPct + (tb.atkPct || 0) + (rangedish ? f.rangedAtkPct || 0 : 0), armor = d.armor + (f.unitArmor || 0) + m.armor + (tb.armor || 0), asPct = 0;
    if (u.home >= 0) for (const a of B.syn) if (a.tier && (!a.tier.only || a.tier.only === d.role)) {
      const x = a.tier.fx; hpPct += x.hpPct || 0; atkPct += x.atkPct || 0; armor += x.armor || 0; asPct += x.asPct || 0;
    }
    const mhp = d.hp * (1 + hpPct / 100), ratio = u.mhp ? u.hp / u.mhp : 1;
    u.mhp = mhp; u.hp = Math.min(mhp, mhp * ratio);
    u.st = { atk: (d.atk || 0) * (1 + atkPct / 100), heal: d.heal || 0, as: d.as * (1 + asPct / 100), armor, range: d.range + (tb.range && rangedish ? tb.range : 0) };
  }
  for (const b of B.blds) {
    if (b.id === 'turret') b.st = { atk: BUILDINGS.turret.atk * (1 + (f.turretAtkPct || 0) / 100), as: BUILDINGS.turret.as * (1 + m.turretAsPct / 100), range: BUILDINGS.turret.range + (f.turretRange || 0), armor: BUILDINGS.turret.armor };
    else if (b.id === 'nexus') b.st = { atk: NEXUS.atk, as: NEXUS.as, range: NEXUS.range, armor: NEXUS.armor };
    else b.st = { armor: b.def.armor || 0 };
  }
}
/* 적 이동용 거리장: 넥서스 옆 칸까지. 건물은 지나갈 수 없지만 '부수고 갈 수 있는 비싼 칸'으로 계산 */
function flowRecalc() {
  const goals = HEX.nbs[B.nexusCell].filter(n => B.tiles[n].walk && !B.bld[n]);
  B.flow = HEX.field(goals.length ? goals : HEX.nbs[B.nexusCell], id => {
    const t = B.tiles[id]; if (!t.walk) return Infinity;
    return (B.bld[id] ? 12 : 1) * (t.slow ? 1.6 : 1);
  });
  B.flowDirty = false;
}

/* 적이 걷는 길(출현 지점마다): 화면 표시·봇용 */
function pathCells() {
  if (B.flowDirty) flowRecalc();
  const out = [];
  for (const s of B.spawns) { let c = s, g = 0; while (g++ < 60) { out.push(c); const nx = HEX.nbs[c].filter(n => B.flow[n] < B.flow[c]).sort((a, b) => B.flow[a] - B.flow[b])[0]; if (nx == null) break; c = nx } }
  return [...new Set(out)];
}
const onPath = c => pathCells().includes(c);
