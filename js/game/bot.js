/* 시험용 봇(시뮬레이션·밸런스 점검용). 사람처럼 일꾼→추출기→병영→유닛 배치→연구→넥서스 강화 */
'use strict';
const BOT_ORDER = ['shield', 'rifle', 'sword', 'rifle', 'medic', 'shield', 'cannon', 'rifle', 'golem', 'sword'];
function botTick() {
  if (!B || B.result) return;
  if (B.phase === 'reward') { actBoon(B.boonChoice[0]); return }
  const bar = B.blds.filter(b => b.id === 'barracks');
  if (B.workers.length + B.wq < Math.min(workerCap(), 10) && B.res.A >= 50 && (B.workers.length < 7 || B.res.A > 200)) actWorker();
  const vent = B.nodes.find(n => n.res === 'B' && !B.bld[n.cell]);
  if (vent && B.res.A >= 75 && B.workers.length >= 5) actBuild('extractor', vent.cell);
  B.wantB = bNodes().length ? (B.res.B > 250 ? 0 : B.t > 150 ? 2 : 1) : 0;
  const near = d => { const c = []; for (let id = 0; id < HEX.N; id++) if (HEX.dist(id, B.nexusCell) === d) c.push(id); return c };
  if (bar.length < (B.t > 200 ? 2 : 1) && B.res.A >= 150) { for (const c of near(2).concat(near(3))) if (!canBuildAt('barracks', c) && !onPath(c)) { actBuild('barracks', c); break } }
  const tur = B.blds.filter(b => b.id === 'turret').length;
  if (tur < 1 + Math.floor(B.t / 150) && tur < 4 && B.res.A >= 140) { for (const c of near(2)) if (!canBuildAt('turret', c) && !onPath(c)) { actBuild('turret', c); break } }
  for (const b of bar) if (b.done && b.queue.length < 2) { const n = B.units.length + B.bench.length; let u = BOT_ORDER[n % BOT_ORDER.length]; if (unitLock(u)) u = 'rifle'; actTrain(b.uid, u) }
  for (const k of ['armor1', 'aim', 'steam', 'towerup', 'mining', 'resolve', 'logistics', 'amp']) if (!techLock(k) && !B.research && B.res.A > 160 && canPay(B.res, TECH[k].cost)) { actResearch(k); break }
  if (B.nexus.lv < 3 && B.units.length >= 3 + B.nexus.lv * 2) actNexusUp();
  /* 배치: 탱커·근접은 길 위(넥서스에서 2~3칸), 원거리는 길 옆(1~2칸) */
  for (const u of B.bench.slice()) {
    const front = u.def.role === 'tank' || u.def.role === 'melee';
    const cells = pathCells().filter(c => { const d = HEX.dist(c, B.nexusCell); return front ? d >= 2 && d <= 3 : d >= 1 && d <= 2 });
    const side = []; for (const c of cells) for (const n of HEX.nbs[c]) side.push(n);
    const order = front ? cells.concat(side) : side.concat(cells);
    for (const c of order) if (!canPlaceAt(c)) { actPlace(u.uid, c); break }
  }
  if (B.nexus.energy >= 100 && B.enemies.some(e => HEX.dist(e.cell, B.nexusCell) <= 2)) actNexusWave();
  if (B.hybrid && B.ultCd <= 0 && B.units.some(u => u.hp < u.mhp * .5)) actUlt();
  if (B.phase === 'prep' && B.wave < 0 && B.units.length >= 3) startWave();
}
