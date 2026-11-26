/* 공명 전쟁 — 규칙 엔진 (화면 코드 없음: 노드에서 시뮬레이션 가능)
   8명이 원형으로 연결 · 각자 판 하나 · 유닛을 사서 '다음 사람' 판으로 보냄 · 타워로 막음 · 새어 나가면 그 판 주인 목숨↓ 후 다음 판으로 */
'use strict';
let S = null;
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];

function mkPlayer(i, race, ai, gap) {
  return { id: i, name: i ? `${i + 1}번` : '나', race, race2: null, ai, aiGap: gap, aiT: Math.random() * 1.5,
    gold: START_GOLD, income: START_INC, life: START_LIFE, alive: true, rank: 0,
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), towers: [], units: [], dist: null, fx: [],
    dealt: 0, kills: 0, sent: 0, leaked: 0, ulv: 0 };
}
/* opt: {race, gap(AI 판단 간격 초), sim(화면 없음), races[8]} */
function newGame(opt = {}) {
  const playable = RK.filter(k => RACES[k].play);
  S = { t: 0, inc: 0, uid: 0, over: false, winner: null, view: 0, reson: false, sim: !!opt.sim, pl: [], log: [], onReson: null };
  for (let i = 0; i < N_PL; i++) {
    const race = i === 0 ? (opt.race || 'human') : (opt.races ? opt.races[i] : pick(playable));
    const p = mkPlayer(i, race, i > 0 || !!opt.allAI, opt.gap || 1.4);
    S.pl.push(p); cellDist(p);
  }
  return S;
}
const nextAlive = i => { for (let k = 1; k < N_PL; k++) { const j = (i + k) % N_PL; if (S.pl[j].alive) return j } return null };

/* 길 찾기: 맨 아래 줄에서 거슬러 올라가며 거리 계산(타워 칸은 막힘) */
function cellDist(p) {
  const d = Array.from({ length: ROWS }, () => Array(COLS).fill(1e9)), q = [];
  for (let x = 0; x < COLS; x++) { d[ROWS - 1][x] = 0; q.push([x, ROWS - 1]) }
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || p.grid[ny][nx] || d[ny][nx] < 1e9) continue;
      d[ny][nx] = d[y][x] + 1; q.push([nx, ny]);
    }
  }
  p.dist = d;
}
function pathCells(p) { /* 지상 유닛이 걷는 길(보여주기·AI용) */
  const out = []; let x = SPAWN_X, y = 0;
  while (y < ROWS - 1 && out.length < 200) {
    out.push([x, y]);
    let best = null;
    for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue; const v = p.dist[ny][nx]; if (v < p.dist[y][x] && (!best || v < best[2])) best = [nx, ny, v] }
    if (!best) break; x = best[0]; y = best[1];
  }
  out.push([x, y]); return out;
}

/* ───── 유닛 ───── */
/* 시간이 지날수록 새로 만든 유닛이 튼튼해져요(후반에 판이 끝나게) + 보낸 사람의 군단 강화 단계 */
const hpMul = o => (1 + Math.pow(S.t / 360, 1.4)) * (1 + .15 * o.ulv);
const ulvCost = lv => Math.round(150 * Math.pow(lv + 1, 1.4));
function spawnUnit(b, def, owner, hp, mhp) {
  const fresh = hp === undefined, n = fresh ? (def.count || 1) : 1, hm = fresh ? hpMul(S.pl[owner]) : 1;
  for (let k = 0; k < n; k++) {
    const air = !!def.air;
    b.units.push({ id: ++S.uid, def, owner, hp: fresh ? def.hp * hm : hp, mhp: fresh ? def.hp * hm : (mhp || hp), armor: def.armor || 0, sp: def.sp, dm: def.dm, air,
      x: air ? .5 + rnd(COLS) : SPAWN_X + .5, y: .5, tx: SPAWN_X, ty: 0, delay: fresh ? k * .4 : 0, pois: 0, poisT: 0, slow: 1, slowT: 0 });
  }
}
function moveGround(p, u, dist) {
  let rem = dist;
  while (rem > 0) {
    const cx = u.tx + .5, cy = u.ty + .5, dx = cx - u.x, dy = cy - u.y, d = Math.hypot(dx, dy);
    if (d > rem) { u.x += dx / d * rem; u.y += dy / d * rem; return null }
    u.x = cx; u.y = cy; rem -= d;
    if (u.ty >= ROWS - 1) return 'exit';
    const cur = p.dist[u.ty][u.tx]; let best = null;
    for (const [ax, ay] of D4) {
      const nx = u.tx + ax, ny = u.ty + ay;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const v = p.dist[ny][nx];
      if (v < cur && (!best || v < best[2] || (v === best[2] && Math.random() < .5))) best = [nx, ny, v];
    }
    if (!best) return null;
    u.tx = best[0]; u.ty = best[1];
  }
  return null;
}
function unitsTick(p, dt) {
  const keep = [];
  for (const u of p.units) {
    if (u.delay > 0) { u.delay -= dt; keep.push(u); continue }
    if (u.poisT > 0) { u.poisT -= dt; u.hp -= u.pois * dt }
    if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slow = 1 }
    if (u.hp <= 0) { onKill(p, u); continue }
    let res = null; const step = u.sp * u.slow * dt;
    if (u.air) { u.y += step; if (u.y >= ROWS - .5) res = 'exit' } else res = moveGround(p, u, step);
    if (res === 'exit') { escape(p, u); continue }
    keep.push(u);
  }
  p.units = keep;
}
function onKill(p, u) { p.gold += Math.ceil(u.def.c / (u.def.count || 1) * KR); p.kills++ }
function escape(p, u) {
  if (p.alive && u.owner !== p.id) {
    const o = S.pl[u.owner], dm = u.dm * lateMul(S.t);
    p.life = Math.max(0, p.life - dm); p.leaked++; o.dealt += dm;
    if (p.life <= 0) eliminate(p);
  }
  const n = nextAlive(p.id);
  if (n !== null && n !== u.owner) spawnUnit(S.pl[n], u.def, u.owner, u.hp, u.mhp);
}
function eliminate(p) {
  p.alive = false; const al = S.pl.filter(q => q.alive); p.rank = al.length + 1;
  say(p.id, `💥 ${p.name} 탈락!`);
  if (al.length <= 1) { S.over = true; S.winner = al[0] ? al[0].id : null; if (al[0]) al[0].rank = 1 }
}
function say(pid, m) { S.log.push({ t: S.t, pid, m }); if (S.log.length > 30) S.log.shift() }

/* ───── 타워 ───── */
function towerTick(p, t, dt) {
  const d = t.def; if (!d.d) return;
  t.cd -= dt; if (t.cd > 0) return; t.cd = 0;
  const rng = d.rng + .1 * (t.lv - 1), cx = t.x + .5, cy = t.y + .5; let best = null, by = -1;
  for (const u of p.units) {
    if (u.delay > 0 || u.hp <= 0 || !d.t.includes(u.air ? 'A' : 'G')) continue;
    if (Math.hypot(u.x - cx, u.y - cy) <= rng && u.y > by) { by = u.y; best = u }
  }
  if (!best) return;
  t.cd = d.cd;
  const u = best, ae = u.armor * (1 - (d.pierce || 0)), dmg = Math.max(1, d.d * (1 + .45 * (t.lv - 1)) - ae);
  u.hp -= dmg;
  if (d.shred) u.armor = Math.max(0, u.armor - d.shred);
  if (d.poison) { u.pois = Math.max(u.pois, d.poison[0]); u.poisT = d.poison[1] }
  if (d.slow) { u.slow = d.slow[0]; u.slowT = d.slow[1] }
  if (d.gold) p.gold += d.gold;
  if (!S.sim) p.fx.push({ x1: cx, y1: cy, x2: u.x, y2: u.y, t: .09, col: d.poison ? '#a3e635' : d.slow ? '#e5e7eb' : d.pierce >= 1 ? '#f87171' : '#fde68a' });
}

/* ───── 행동 (사람·AI 공통) — 돌려주는 글이 비어 있으면 성공 ───── */
const unitBlocks = (p, x, y) => p.units.some(u => !u.air && u.delay <= 0 && (Math.hypot(u.x - x - .5, u.y - y - .5) < .9 || (u.tx === x && u.ty === y)));
function actBuild(pid, x, y, tid) {
  const p = S.pl[pid], d = T[tid];
  if (!p || !p.alive || !d || !allowed(d, p.race, p.race2)) return '쓸 수 없는 타워예요';
  if (y < 1 || y > ROWS - 2 || x < 0 || x >= COLS || p.grid[y][x]) return '여기엔 지을 수 없어요';
  if (p.gold < d.c) return '골드가 부족해요';
  if (unitBlocks(p, x, y)) return '유닛이 지나가는 중이에요';
  const t = { def: d, id: tid, x, y, cd: 0, lv: 1, spent: d.c };
  p.grid[y][x] = t; cellDist(p);
  if (!(p.dist[0][SPAWN_X] < 1e9 && p.units.every(u => u.air || p.dist[u.ty][u.tx] < 1e9))) { p.grid[y][x] = null; cellDist(p); return '길을 완전히 막을 수는 없어요' }
  p.gold -= d.c; p.towers.push(t); if (d.inc) p.income += d.inc; return '';
}
function actUpgrade(pid, x, y) {
  const p = S.pl[pid], t = p && p.grid[y] && p.grid[y][x];
  if (!t || !t.def.d) return '강화할 수 없어요'; if (t.lv >= 3) return '이미 최고 단계예요';
  const c = Math.ceil(t.def.c * .6 * t.lv); if (p.gold < c) return '골드가 부족해요';
  p.gold -= c; t.spent += c; t.lv++; return '';
}
function actSell(pid, x, y) {
  const p = S.pl[pid], t = p && p.grid[y] && p.grid[y][x]; if (!t) return '';
  p.gold += Math.floor(t.spent * .7); p.grid[y][x] = null; p.towers = p.towers.filter(q => q !== t);
  if (t.def.inc) p.income -= t.def.inc; cellDist(p); return '';
}
function actSend(pid, uid) {
  const p = S.pl[pid], d = U[uid];
  if (!p || !p.alive || !d || !allowed(d, p.race, p.race2)) return '쓸 수 없는 유닛이에요';
  if (p.gold < d.c) return '골드가 부족해요';
  const n = nextAlive(pid); if (n === null) return '';
  p.gold -= d.c; p.income += d.inc; p.sent++; spawnUnit(S.pl[n], d, pid); return '';
}
function actTech(pid) {
  const p = S.pl[pid]; if (!p || !p.alive) return '';
  if (p.ulv >= 10) return '이미 최고 단계예요';
  const c = ulvCost(p.ulv); if (p.gold < c) return '골드가 부족해요';
  p.gold -= c; p.ulv++; return '';
}
const availT = p => Object.keys(T).filter(k => allowed(T[k], p.race, p.race2));
const availU = p => Object.keys(U).filter(k => allowed(U[k], p.race, p.race2));

/* ───── AI ───── */
function aiBuild(p) {
  const ids = availT(p).filter(k => T[k].c <= p.gold && (k !== 'wall' || Math.random() < .2));
  if (!ids.length) return false;
  const path = pathCells(p), cands = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) {
    if (p.grid[y][x]) continue;
    let m = 9; for (const [px, py] of path) m = Math.min(m, Math.abs(px - x) + Math.abs(py - y));
    if (m <= 2) cands.push([x, y]);
  }
  for (let k = 0; k < 6 && cands.length; k++) {
    const c = cands.splice(rnd(cands.length), 1)[0], tid = pick(ids);
    if (!actBuild(p.id, c[0], c[1], tid)) return true;
  }
  return false;
}
function aiSend(p) {
  const ids = availU(p).filter(k => U[k].c <= p.gold); if (!ids.length) return false;
  const rich = p.gold > 400, tid = rich ? ids.sort((a, b) => U[b].c - U[a].c)[rnd(Math.min(2, ids.length))] : pick(ids);
  return !actSend(p.id, tid);
}
function aiUpgrade(p) {
  const ts = p.towers.filter(t => t.def.d && t.lv < 3); if (!ts.length) return;
  const t = pick(ts); actUpgrade(p.id, t.x, t.y);
}
function aiTick(p) {
  if (!p.race2 && S.t >= RESON_T + p.id * 5) p.race2 = pick(RK.filter(k => RACES[k].play && k !== p.race));
  const att = p.towers.filter(t => t.def.d).length, want = 3 + Math.floor(S.t / 40);
  const build = att < want ? Math.random() < .65 : Math.random() < .25;
  if (build) { if (!aiBuild(p)) aiSend(p) } else { if (!aiSend(p)) aiBuild(p) }
  if (Math.random() < .15) aiUpgrade(p);
  if (p.ulv < 10 && p.gold > ulvCost(p.ulv) * 1.6 && Math.random() < .5) actTech(p.id);
  /* 부자일수록 한 번에 여러 번 행동 */
  for (let n = p.gold > 900 ? 4 : p.gold > 450 ? 2 : 0; n > 0; n--) { if (!aiSend(p)) break }
}

/* ───── 한 걸음 ───── */
function step(dt) {
  if (S.over) return;
  S.t += dt; S.inc += dt;
  if (S.inc >= TICK) { S.inc -= TICK; for (const p of S.pl) if (p.alive) p.gold += p.income }
  for (const p of S.pl) {
    if (p.alive && p.ai) { p.aiT -= dt; if (p.aiT <= 0) { p.aiT = p.aiGap * (.8 + Math.random() * .4); aiTick(p) } }
    if (p.alive) for (const t of p.towers) towerTick(p, t, dt);
    unitsTick(p, dt);
    if (p.fx.length) p.fx = p.fx.filter(f => (f.t -= dt) > 0);
  }
  if (!S.reson && S.t >= RESON_T) { S.reson = true; if (S.onReson) S.onReson() }
}
