/* 전투: 적 출현·적 AI·유닛 자동 전투·피해·웨이브·승패 */
'use strict';
function fxPush(f) { if (!B.sim) { B.fx.push(f); if (B.fx.length > 160) B.fx.shift() } }
const wpos = e => e.air ? { x: e.x, y: e.y } : lerpPos(e);
function lerpPos(e) {
  const b = HEX.world(e.cell); if (!e.moving || e.from < 0) return b;
  const a = HEX.world(e.from), k = e.mt; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
/* 칸 거리(공중이 끼면 월드 거리로) */
function rangeTo(a, b) {
  if (a.air || b.air) { const p = wpos(a), q = wpos(b); return Math.hypot(p.x - q.x, p.y - q.y) / SQ3 }
  return HEX.dist(a.cell, b.cell);
}
function nearest(from, list, maxR) { let best = null, bd = 1e9; for (const x of list) { if (x.hp <= 0) continue; const d = rangeTo(from, x); if (d <= maxR && d < bd) { bd = d; best = x } } return best }
const pTargets = () => B.units.concat(B.blds);

/* ── 피해 ── */
function hurt(t, raw, atkType, src) {
  if (t.hp <= 0) return 0;
  const at = atkType || 'normal', mult = (DMG_MULT[at] || DMG_MULT.normal)[t.def.armorType || 'light'] || 1;
  const armor = at === 'magic' ? 0 : (t.st ? t.st.armor : t.armor || 0);
  let dmg = Math.max(1, raw * mult - armor);
  if (t.sh > 0) { const a = Math.min(t.sh, dmg); t.sh -= a; dmg -= a }
  t.hp -= dmg;
  if (t === B.nexus) B.lastHit = B.t;
  if (!B.sim && dmg >= 1) { const p = wpos(t); fxPush({ k: 'txt', x: p.x, y: p.y - .4, s: Math.round(dmg), t: .6, T: .6, col: t.team === 'p' ? '#fca5a5' : '#fde68a' }) }
  return dmg;
}
function attack(a, t) {
  if (a.cd > 0) return true;
  const st = a.st || a, as = st.as || a.def.as;
  a.cd = 1 / as;
  const atk = (st.atk != null ? st.atk : a.atk), type = a.def.atkType || 'normal';
  hurt(t, atk, type, a);
  if (a.def.splash) for (const o of B.enemies) if (o !== t && HEX.dist(o.cell, t.cell) <= a.def.splash) hurt(o, atk * .6, type, a);
  const p = wpos(a), q = wpos(t);
  fxPush({ k: a.def.splash ? 'arc' : 'shot', x1: p.x, y1: p.y, x2: q.x, y2: q.y, t: .15, T: .15, col: a.team === 'p' ? (a.def.splash ? '#fb923c' : '#e0f2fe') : '#bef264' });
  if (a.def.splash) fxPush({ k: 'ring', x: q.x, y: q.y, r: SQ3 * a.def.splash, t: .35, T: .35, col: '#fb923c' });
  return true;
}
/* ── 이동(한 칸씩, 점유 예약) ── */
function moveTo(e, cell) {
  B.occ[e.cell] = null; e.from = e.cell; e.cell = cell; B.occ[cell] = e; e.moving = true; e.mt = 0;
}
function moveTick(e, dt) {
  if (!e.moving) return;
  const slow = e.team === 'e' && B.tiles[e.cell].slow ? B.tiles[e.cell].slow : 1;
  e.mt += dt * e.speed * slow;
  if (e.mt >= 1) { e.mt = 1; e.moving = false }
}
/* target 칸에서 range 안으로 들어가는 첫 걸음. okCell(칸): 추가 조건(목줄 등) */
function stepToward(e, target, range, okCell) {
  const pass = id => B.tiles[id].walk && !B.bld[id] && (!okCell || okCell(id));
  const path = HEX.path(e.cell, pass, id => HEX.dist(id, target) <= range && pass(id), 40);
  if (!path || path.length < 2) return false;
  const nx = path[1];
  if (B.occ[nx]) {
    /* 막혔으면 목표에 더 가까워지는 다른 빈 칸 */
    const alt = HEX.nbs[e.cell].filter(n => pass(n) && !B.occ[n] && HEX.dist(n, target) < HEX.dist(e.cell, target));
    if (!alt.length) return false;
    moveTo(e, alt[0]); return true;
  }
  moveTo(e, nx); return true;
}

/* ── 적 ── */
function spawnEnemy(eid, cell) {
  const d = ENEMIES[eid], D = B.D, hp = d.hp * D.hp;
  const e = { uid: ++B.uid, kind: 'enemy', team: 'e', id: eid, def: d, hp, mhp: hp, atk: d.atk * D.atk, armor: d.armor, speed: d.speed, range: d.range, as: d.as, cd: .5, sh: 0, air: !!d.air, cell, from: cell, mt: 1, moving: false, skillT: {}, phase: 1 };
  if (e.air) { const p = HEX.world(cell); e.x = p.x; e.y = p.y; e.cell = -1; B.air.push(e) }
  else { B.occ[cell] = e; B.enemies.push(e) }
  if (d.boss) { say(`👑 ${d.n} 등장!`, 'bad'); (d.skills || []).forEach(s => e.skillT[s.k] = s.every) }
  return e;
}
function freeNear(cell) { if (B.tiles[cell].walk && !B.occ[cell] && !B.bld[cell]) return cell; for (const n of HEX.nbs[cell]) if (B.tiles[n].walk && !B.occ[n] && !B.bld[n]) return n; return -1 }
function enemyThink(e) {
  const d = e.def, rng = e.range;
  let tg = null;
  const taunt = B.units.filter(u => u.def.taunt && u.hp > 0 && HEX.dist(u.cell, e.cell) <= u.def.taunt);
  if (taunt.length) tg = nearest(e, taunt, 99);
  else if (d.ai === 'defense') tg = nearest(e, B.units.concat(B.blds.filter(b => b.id === 'turret')), 5);
  else if (d.ai === 'backline') tg = nearest(e, B.units.filter(u => ['ranged', 'support', 'siege'].includes(u.def.role)), 99);
  else if (d.ai === 'building') tg = nearest(e, B.blds.filter(b => b.id !== 'nexus'), 99);
  if (tg) {
    if (rangeTo(e, tg) <= rng) return attack(e, tg);
    if (stepToward(e, tg.cell, rng)) return true;
  }
  const near = nearest(e, pTargets(), rng); if (near) return attack(e, near);
  return flowStep(e);
}
function flowStep(e) {
  if (B.flowDirty) flowRecalc();
  const f = B.flow, cur = f[e.cell];
  const cand = HEX.nbs[e.cell].filter(n => f[n] < cur).sort((a, b) => f[a] - f[b]);
  for (const c of cand) {
    if (B.bld[c]) return attack(e, B.bld[c]);
    const o = B.occ[c];
    if (o && o.team === 'p') return attack(e, o);
    if (!o) { moveTo(e, c); return true }
  }
  return false;
}
function airThink(e) {
  const near = nearest(e, pTargets().filter(x => x.kind === 'bld'), e.range); if (near) return attack(e, near);
  const t = HEX.world(B.nexusCell), dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy);
  e.vx = dx / d; e.vy = dy / d; return false;
}
function bossTick(e, dt) {
  const d = e.def; if (!d.boss) return;
  if (e.phase === 1 && e.hp < e.mhp * d.phase2.at) {
    e.phase = 2; e.speed *= d.phase2.speedMul; e.armor += d.phase2.armorAdd; say(`👑 ${d.n}이(가) 광폭해졌어요!`, 'bad');
    for (let i = 0; i < 4; i++) spawnEnemy(d.phase2.summon, B.spawns[i % B.spawns.length]);
  }
  for (const s of d.skills) {
    e.skillT[s.k] -= dt; if (e.skillT[s.k] > 0) continue; e.skillT[s.k] = s.every * (e.phase === 2 ? .75 : 1);
    if (s.k === 'summon') { for (let i = 0; i < s.n; i++) { const c = freeNear(HEX.nbs[e.cell][i % HEX.nbs[e.cell].length]); if (c >= 0) spawnEnemy(s.e, c) } say(`👑 모후가 새끼를 불러냈어요`, 'bad') }
    if (s.k === 'acid') {
      const cand = pTargets().filter(x => x.hp > 0 && x.cell >= 0 && HEX.dist(x.cell, e.cell) <= s.range); if (!cand.length) continue;
      const c = pick(cand).cell, p = HEX.world(c);
      for (const x of pTargets()) if (x.cell >= 0 && HEX.dist(x.cell, c) <= s.radius) hurt(x, s.dmg * B.D.atk, 'siege', e);
      fxPush({ k: 'ring', x: p.x, y: p.y, r: SQ3 * (s.radius + .5), t: .7, T: .7, col: '#a3e635' });
    }
  }
}

/* ── 우리 유닛·건물 ── */
function unitThink(u) {
  const d = u.def, st = u.st;
  const inLeash = id => HEX.dist(id, u.home) <= LEASH;
  if (d.role === 'support') {
    const hurtA = B.units.filter(x => x !== u && x.hp < x.mhp && x.hp > 0);
    const h = nearest(u, hurtA, st.range);
    if (h) { if (u.cd > 0) return true; u.cd = 1 / st.as; h.hp = Math.min(h.mhp, h.hp + st.heal); const p = wpos(u), q = wpos(h); fxPush({ k: 'shot', x1: p.x, y1: p.y, x2: q.x, y2: q.y, t: .2, T: .2, col: '#86efac' }); return true }
    const far = nearest(u, hurtA.filter(x => inLeash(x.cell)), 99);
    if (far && stepToward(u, far.cell, st.range, inLeash)) return true;
    if (u.cell !== u.home) return stepToward(u, u.home, 0);
    return false;
  }
  const cand = d.air ? B.enemies.concat(B.air) : B.enemies;
  const tg = nearest(u, cand, st.range); if (tg) return attack(u, tg);
  const ch = nearest(u, B.enemies.filter(e => HEX.dist(e.cell, u.home) <= LEASH + st.range), 99);
  if (ch && stepToward(u, ch.cell, st.range, inLeash)) return true;
  if (u.cell !== u.home && !ch) return stepToward(u, u.home, 0);
  return false;
}
function towerThink(b) {
  if (!b.done || !b.st || !b.st.atk) return;
  const t = nearest(b, B.enemies.concat(B.air), b.st.range); if (t) attack(b, t);
}

/* ── 웨이브 ── */
function startWave() {
  if (B.phase !== 'prep' || B.result) return '';
  const bonus = Math.floor(Math.max(0, B.prepT)) * 2; if (bonus > 0) { B.res.A += bonus; say(`⏩ 빨리 시작 보너스 ${RES.A.ic}+${bonus}`) }
  B.wave++; B.phase = 'wave'; B.waveT = 0; B.spawnQ = [];
  const w = B.st.waves[B.wave]; let k = 0;
  for (const g of w.g) for (let i = 0; i < g.n; i++) B.spawnQ.push({ t: (g.delay || 0) + i * g.every * B.D.spawn, e: g.e, sp: g.sp != null ? g.sp : (k++) % B.spawns.length });
  B.spawnQ.sort((a, b) => a.t - b.t);
  say(`🌊 웨이브 ${B.wave + 1}/${B.st.waves.length} 시작!`, 'bad'); return '';
}
function waveTick(dt) {
  if (B.phase === 'prep') { B.prepT -= dt; if (B.prepT <= 0) startWave(); return }
  if (B.phase !== 'wave') return;
  B.waveT += dt;
  while (B.spawnQ.length && B.spawnQ[0].t <= B.waveT) {
    const q = B.spawnQ[0], cell = B.spawns[q.sp % B.spawns.length];
    if (ENEMIES[q.e].air) { spawnEnemy(q.e, cell); B.spawnQ.shift(); continue }
    const c = freeNear(cell); if (c < 0) { q.t += .5; B.spawnQ.sort((a, b) => a.t - b.t); break }
    spawnEnemy(q.e, c); B.spawnQ.shift();
  }
  if (!B.spawnQ.length && !B.enemies.length && !B.air.length) {
    const w = B.st.waves[B.wave]; B.res.A += w.reward.A; B.res.B += w.reward.B;
    if (B.wave >= B.st.waves.length - 1) { B.result = 'win'; B.phase = 'end'; say('🏆 스테이지 클리어!', 'good'); return }
    say(`✅ 웨이브 ${B.wave + 1} 방어! 보상 ${costTxt(w.reward)}`, 'good');
    const keys = Object.keys(BOONS).sort(() => Math.random() - .5).slice(0, 3);
    B.boonChoice = keys; B.phase = 'reward';
  }
}
function actBoon(k) {
  if (B.phase !== 'reward' || !B.boonChoice.includes(k)) return '';
  const f = BOONS[k].fx;
  if (f.A) B.res.A += f.A; if (f.B) B.res.B += f.B;
  if (f.repair) { B.nexus.hp = Math.min(B.nexus.mhp, B.nexus.hp + B.nexus.mhp * .3); for (const b of B.blds) if (b.done) b.hp = b.mhp }
  if (f.atkPct) B.mods.atkPct += f.atkPct; if (f.armor) B.mods.armor += f.armor; if (f.turretAsPct) B.mods.turretAsPct += f.turretAsPct;
  refreshStats(); B.boonChoice = null; B.phase = 'prep'; B.prepT = B.st.between; say(`${BOONS[k].ic} ${BOONS[k].n} 선택`); return '';
}

/* ── 한 걸음 ── */
function stepBattle(dt) {
  if (!B || B.result) return;
  B.t += dt;
  if (B.phase === 'reward') return; /* 보상 고르는 동안 멈춤 */
  econTick(dt); buildTick(dt); waveTick(dt);
  if (B.result) return;
  const nx = B.nexus;
  nx.energy = Math.min(NEXUS.energyMax, nx.energy + NEXUS.energyRegen * (1 + (B.fx0.energyPct || 0) / 100) * dt);
  if (B.t - B.lastHit > 6) nx.sh = Math.min(nx.msh, nx.sh + nx.msh * .05 * dt);
  if (B.ultCd > 0) B.ultCd -= dt;
  for (const x of B.units) { x.cd -= dt; if (x.shT > 0) { x.shT -= dt; if (x.shT <= 0) x.sh = 0 } moveTick(x, dt) }
  for (const e of B.enemies) { e.cd -= dt; moveTick(e, dt); bossTick(e, dt) }
  for (const b of B.blds) b.cd -= dt;
  /* 생각: 움직이는 중이 아닐 때만 */
  for (const u of B.units) if (!u.moving && u.hp > 0) unitThink(u);
  for (const e of B.enemies) if (!e.moving && e.hp > 0) enemyThink(e);
  for (const e of B.air) { e.cd -= dt; if (e.hp > 0 && !airThink(e)) { e.x += e.vx * e.speed * SQ3 * dt; e.y += e.vy * e.speed * SQ3 * dt } }
  for (const b of B.blds) towerThink(b);
  cleanup();
  for (const f of B.fx) f.t -= dt; B.fx = B.fx.filter(f => f.t > 0);
}
function cleanup() {
  const dead = e => e.hp <= 0;
  for (const e of B.enemies.concat(B.air)) if (dead(e)) { B.res.A += e.def.bounty.A || 0; B.res.B += e.def.bounty.B || 0; B.stats.kills++; if (e.cell >= 0 && B.occ[e.cell] === e) B.occ[e.cell] = null; if (e.def.boss) say(`👑 ${e.def.n} 처치!`, 'good') }
  B.enemies = B.enemies.filter(e => !dead(e)); B.air = B.air.filter(e => !dead(e));
  for (const u of B.units) if (dead(u)) { B.occ[u.cell] = null; B.stats.lost++; say(`💀 ${u.def.n} 쓰러짐`, 'bad') }
  const before = B.units.length; B.units = B.units.filter(u => !dead(u)); if (B.units.length !== before) refreshStats();
  for (const b of B.blds) if (dead(b)) {
    if (b === B.nexus) { B.result = 'lose'; B.phase = 'end'; say('💥 넥서스가 무너졌어요…', 'bad'); return }
    B.bld[b.cell] = null; B.flowDirty = true; say(`💥 ${b.def.n} 파괴됨`, 'bad');
    if (b.id === 'extractor') { const n = B.nodes.find(n => n.cell === b.cell); if (n) { n.active = false; n.user = null } }
  }
  B.blds = B.blds.filter(b => !dead(b));
}
