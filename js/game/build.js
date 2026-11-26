/* 건설·생산·배치·연구·넥서스. 행동 함수는 실패 이유 글을 돌려주고, 성공하면 '' */
'use strict';
/* ── 건물 ── */
function canBuildAt(id, cell) {
  const d = BUILDINGS[id], t = B.tiles[cell];
  if (!t) return '맵 밖이에요';
  if (B.bld[cell]) return '이미 건물이 있어요';
  if (B.occ[cell]) return '유닛이 서 있어요';
  if (d.needTile) { if (t.k !== d.needTile) return `${d.n}${jo(d.n, '은', '는')} ${TILES.v.n} 위에만 지어요` }
  else if (t.buildOnly) return '이 칸은 정수 추출기 전용이에요';
  else if (!t.build) return '여기엔 지을 수 없어요';
  if (spawnDist(cell) < 2) return '적 출현 지점과 너무 가까워요';
  return '';
}
function actBuild(id, cell) {
  if (B.result) return '';
  const d = BUILDINGS[id]; if (!d) return '없는 건물이에요';
  const why = canBuildAt(id, cell); if (why) return why;
  if (!canPay(B.res, d.cost)) return '자원이 부족해요';
  pay(B.res, d.cost);
  const hp = d.hp * hybHp();
  const b = { uid: ++B.uid, kind: 'bld', id, def: d, cell, hp: hp * .3, mhp: hp, done: false, prog: d.time, queue: [], cd: 0, team: 'p' };
  B.blds.push(b); B.bld[cell] = b; B.flowDirty = true; B.stats.built++; refreshStats();
  return '';
}
function buildTick(dt) {
  for (const b of B.blds) {
    if (!b.done) {
      b.prog -= dt; b.hp = Math.min(b.mhp, b.hp + b.mhp * .7 * dt / b.def.time);
      if (b.prog <= 0) { b.done = true; say(`🏗 ${b.def.n} 완성`); if (b.id === 'extractor') { const n = B.nodes.find(n => n.cell === b.cell); if (n) n.active = true } }
      continue;
    }
    /* 병영 생산: 맨 앞 하나만 진행 */
    if (b.queue && b.queue.length) {
      const q = b.queue[0];
      if (B.bench.length >= BENCH_MAX) continue;
      q.t -= dt;
      if (q.t <= 0) { b.queue.shift(); const u = mkUnit(q.u); B.bench.push(u); refreshStats(); say(`⚔️ ${u.def.n} 준비 완료 — 대기석에서 골라 배치하세요`, 'good') }
    }
  }
  if (B.nexusUp) { B.nexusUp.t -= dt; if (B.nexusUp.t <= 0) { const nx = B.nexus, L = NEXUS.lv[nx.lv + 1]; nx.lv++; const r = nx.hp / nx.mhp; nx.mhp = L.hp * (1 + (B.meta.nexusHp || 0) * META.nexusHp.per / 100) * hybHp(); nx.hp = nx.mhp * r; nx.msh = L.sh; B.nexusUp = null; say(`💠 넥서스 레벨 ${nx.lv}! ${L.d}`, 'good') } }
  if (B.research) { B.research.t -= dt; if (B.research.t <= 0) { B.techDone[B.research.id] = 1; say(`🔬 연구 완료: ${TECH[B.research.id].n}`, 'good'); B.research = null; techRecalc(); refreshStats() } }
}
/* ── 유닛 생산 ── */
function unitLock(uid) {
  const d = UNITS[uid]; if (!d) return '없는 유닛이에요';
  if (d.req && d.req.tech && !B.techDone[d.req.tech]) return `연구 필요: ${TECH[d.req.tech].n}`;
  if (d.req && d.req.hybrid && B.hybrid !== d.req.hybrid) return `혼성 종족 필요: ${HYBRIDS[d.req.hybrid].n}`;
  return '';
}
function actTrain(bldUid, uid) {
  if (B.result) return '';
  const b = B.blds.find(x => x.uid === bldUid); if (!b || b.id !== 'barracks') return '병영을 골라 주세요';
  if (!b.done) return '병영을 짓는 중이에요';
  const lock = unitLock(uid); if (lock) return lock;
  if (b.queue.length >= QUEUE_MAX) return `대기열은 최대 ${QUEUE_MAX}개예요`;
  const d = UNITS[uid]; if (!canPay(B.res, d.cost)) return '자원이 부족해요';
  pay(B.res, d.cost); b.queue.push({ u: uid, t: d.time }); return '';
}
function mkUnit(uid) {
  const d = UNITS[uid];
  return { uid: ++B.uid, kind: 'unit', team: 'p', id: uid, def: d, cell: -1, home: -1, hp: d.hp, mhp: d.hp, speed: d.speed, cd: 0, sh: 0, shT: 0, moving: false, from: -1, mt: 1, act: 0 };
}
/* ── 배치(대기석 → 칸) ── */
function canPlaceAt(cell) {
  const t = B.tiles[cell];
  if (!t || !t.place) return '여기엔 배치할 수 없어요';
  if (B.bld[cell] || B.occ[cell]) return '이미 무언가 있어요';
  if (spawnDist(cell) < 2) return '적 출현 지점과 너무 가까워요';
  return '';
}
function actPlace(unitUid, cell) {
  if (B.result) return '';
  const bi = B.bench.findIndex(u => u.uid === unitUid), placed = B.units.find(u => u.uid === unitUid);
  if (bi < 0 && !placed) return '';
  if (placed && B.phase === 'wave') return '웨이브 중에는 위치를 바꿀 수 없어요';
  const why = canPlaceAt(cell); if (why) return why;
  let u;
  if (bi >= 0) { u = B.bench.splice(bi, 1)[0]; B.units.push(u) } else { u = placed; B.occ[u.cell] = null }
  u.cell = u.home = cell; u.from = cell; u.mt = 1; u.moving = false; B.occ[cell] = u;
  refreshStats(); return '';
}
function actUnplace(unitUid) {
  if (B.phase === 'wave') return '웨이브 중에는 거둘 수 없어요';
  const i = B.units.findIndex(u => u.uid === unitUid); if (i < 0) return '';
  if (B.bench.length >= BENCH_MAX) return '대기석이 가득 찼어요';
  const u = B.units.splice(i, 1)[0]; B.occ[u.cell] = null; u.cell = u.home = -1; B.bench.push(u); refreshStats(); return '';
}
/* ── 연구 ── */
function techLock(id) {
  const t = TECH[id]; if (B.techDone[id]) return '완료';
  if (B.nexus.lv < t.tier) return `넥서스 레벨 ${t.tier} 필요`;
  return '';
}
function actResearch(id) {
  if (B.result) return '';
  const t = TECH[id]; if (!t) return '';
  const lock = techLock(id); if (lock) return lock;
  if (B.research) return '연구는 한 번에 하나씩이에요';
  if (!canPay(B.res, t.cost)) return '자원이 부족해요';
  pay(B.res, t.cost); B.research = { id, t: t.time, T: t.time }; return '';
}
/* ── 넥서스 ── */
function actNexusUp() {
  if (B.result) return '';
  const nx = B.nexus, L = NEXUS.lv[nx.lv + 1];
  if (!L) return '최고 레벨이에요';
  if (!L.ready) return `레벨 ${nx.lv + 1}(${L.d})은 아직 준비 중이에요`;
  if (B.nexusUp) return '이미 강화 중이에요';
  if (!canPay(B.res, L.cost)) return '자원이 부족해요';
  pay(B.res, L.cost); B.nexusUp = { t: L.time, T: L.time }; return '';
}
function actNexusWave() {
  const nx = B.nexus; if (B.result) return '';
  if (nx.energy < NEXUS.energyMax) return '에너지가 부족해요';
  nx.energy = 0;
  const dmg = NEXUS.wave.dmg * (1 + (B.fx0.waveMul || 0)), c = HEX.world(B.nexusCell);
  for (const e of B.enemies) if (HEX.dist(e.cell, B.nexusCell) <= NEXUS.wave.radius) hurt(e, dmg, 'magic', nx);
  for (const e of B.air) if (Math.hypot(e.x - c.x, e.y - c.y) <= NEXUS.wave.radius * SQ3) hurt(e, dmg, 'magic', nx);
  nx.sh = Math.min(nx.msh, nx.sh + NEXUS.wave.shield);
  fxPush({ k: 'ring', x: c.x, y: c.y, r: NEXUS.wave.radius * SQ3, t: .6, T: .6, col: '#7dd3fc' }); say('💠 아르카 파동!', 'good'); return '';
}
/* 혼성 궁극기: 반석 결속 */
const ULT = { bansuk: { n: '반석 결속', cost: { B: 40 }, cd: 60, d: '모든 배치 유닛에게 최대 체력 40% 보호막(8초)' } };
function actUlt() {
  const u = ULT[B.hybrid]; if (!u || B.result) return '쓸 수 있는 궁극기가 없어요';
  if (B.ultCd > 0) return `재사용 대기 ${Math.ceil(B.ultCd)}초`;
  if (!canPay(B.res, u.cost)) return '정수가 부족해요';
  pay(B.res, u.cost); B.ultCd = u.cd;
  for (const x of B.units) { x.sh = x.mhp * .4; x.shT = 8 }
  say(`🗿 ${u.n}!`, 'good'); return '';
}
