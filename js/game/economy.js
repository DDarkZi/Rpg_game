/* 경제: 일꾼 생산·자동 채집(루멘/정수 배분) */
'use strict';
function addWorker() {
  const p = HEX.world(B.nexusCell);
  B.workers.push({ uid: ++B.uid, job: 'A', st: 'idle', node: null, x: p.x, y: p.y, t: 0, carry: 0 });
}
/* 일꾼 생산 주문(넥서스) */
function actWorker() {
  if (B.result) return '';
  if (B.workers.length + B.wq >= workerCap()) return `일꾼은 최대 ${workerCap()}명이에요`;
  if (!canPay(B.res, WORKER.cost)) return '루멘이 부족해요';
  pay(B.res, WORKER.cost); B.wq++; if (B.wq === 1) B.wqT = WORKER.time; return '';
}
/* 정수 담당 일꾼 수 정하기 */
function actWantB(n) { B.wantB = clamp(n, 0, workerCap()); return '' }
const bNodes = () => B.nodes.filter(n => n.res === 'B' && n.active);
function econTick(dt) {
  if (B.wq > 0) { B.wqT -= dt; if (B.wqT <= 0) { addWorker(); B.wq--; B.wqT = WORKER.time; say('⛏ 일꾼 1명 생산') } }
  const nx = HEX.world(B.nexusCell), gT = WORKER.gather * (1 - (B.meta.mine || 0) * META.mine.per / 100), sp = WORKER.speed;
  /* 정수 담당 인원 맞추기(돌아온 일꾼부터 바꿈) */
  const wantB = bNodes().length ? Math.min(B.wantB, B.workers.length) : 0;
  let haveB = B.workers.filter(w => w.job === 'B').length;
  for (const w of B.workers) {
    if (w.st === 'idle') {
      if (w.job === 'B' && haveB > wantB) { w.job = 'A'; haveB-- } else if (w.job === 'A' && haveB < wantB) { w.job = 'B'; haveB++ }
      const ns = B.nodes.filter(n => n.res === w.job && n.active);
      if (!ns.length) continue;
      /* 덜 붐비는 가까운 광맥으로 */
      const load = n => B.workers.filter(o => o.node === n).length;
      w.node = ns.sort((a, b) => (load(a) * 3 + HEX.dist(a.cell, B.nexusCell)) - (load(b) * 3 + HEX.dist(b.cell, B.nexusCell)))[0];
      w.st = 'go';
    }
    if (w.st === 'go' || w.st === 'back') {
      if (w.st === 'go' && !w.node.active) { w.st = 'back'; continue }
      const tp = w.st === 'go' ? standPoint(w.node) : nx, dx = tp.x - w.x, dy = tp.y - w.y, d = Math.hypot(dx, dy), s = sp * dt;
      if (d > s) { w.x += dx / d * s; w.y += dy / d * s; continue }
      w.x = tp.x; w.y = tp.y;
      if (w.st === 'go') { if (!w.node.user) { w.node.user = w; w.st = 'gather'; w.t = gT } }
      else { if (w.carry) { B.res[w.cr] += w.carry; w.carry = 0 } w.st = 'idle'; w.node = null }
    } else if (w.st === 'gather') {
      w.t -= dt;
      if (w.t <= 0) { w.cr = w.node.res; w.carry = WORKER.carry[w.cr] + (w.cr === 'A' ? B.fx0.carryA || 0 : 0); w.node.user = null; w.st = 'back' }
    }
  }
}
/* 광맥 바로 옆(넥서스 쪽)에 서서 캠 */
function standPoint(n) {
  const a = HEX.world(n.cell), b = HEX.world(B.nexusCell), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx / d * .75, y: a.y + dy / d * .75 };
}
