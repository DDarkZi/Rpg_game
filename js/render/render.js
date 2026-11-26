/* 화면 그리기(캔버스 2D). 지금은 임시 도형+이모지 — 나중에 스프라이트로 바꿔 끼울 수 있게 drawEntity 한 곳에서 그림 */
'use strict';
const CAM = { s: 30, ox: 0, oy: 0, fit: true };
let cvs, ctx, DPR = 1;
function renderInit(canvas) { cvs = canvas; ctx = canvas.getContext('2d'); resizeCanvas() }
function resizeCanvas() {
  if (!cvs) return; DPR = Math.min(2, window.devicePixelRatio || 1);
  const r = cvs.getBoundingClientRect(); cvs.width = Math.round(r.width * DPR); cvs.height = Math.round(r.height * DPR);
  if (CAM.fit) camFit();
}
function camFit() {
  if (!B) return; const r = cvs.getBoundingClientRect(), ww = SQ3 * (HEX.W + .5), wh = 1.5 * (HEX.H - 1) + 2;
  CAM.s = Math.min(r.width / ww, r.height / wh) * .98; CAM.ox = (r.width - ww * CAM.s) / 2; CAM.oy = (r.height - wh * CAM.s) / 2;
}
const toScr = (x, y) => [x * CAM.s + CAM.ox, y * CAM.s + CAM.oy];
const toWorld = (sx, sy) => [(sx - CAM.ox) / CAM.s, (sy - CAM.oy) / CAM.s];
function hexPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) } ctx.closePath() }
const TILE_IC = { atk: '⚔', def: '🛡', high: '⛰', mud: '〰', resA: '💎', vent: '🟣', spawn: '☠' };
function emoji(t, x, y, px) { ctx.font = `${px}px "Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y) }
function bar(x, y, w, f, col, h) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y, w, h || 3); ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), h || 3) }

/* ui: {tool, sel, hover, showDmg} */
function drawBattle(ui) {
  const W = cvs.width / DPR, H = cvs.height / DPR, s = CAM.s, R = s * .98;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0b0e18'; ctx.fillRect(0, 0, W, H);
  const valid = ui.tool ? (ui.tool.k === 'build' ? id => !canBuildAt(ui.tool.id, id) : id => !canPlaceAt(id)) : null;
  const path = new Set(pathCells());
  /* 타일 */
  for (let id = 0; id < HEX.N; id++) {
    const t = B.tiles[id], p = HEX.world(id), [x, y] = toScr(p.x, p.y);
    hexPath(x, y, R * .97); ctx.fillStyle = t.col; ctx.fill();
    if (valid && valid(id)) { ctx.fillStyle = 'rgba(74,222,128,.28)'; ctx.fill() }
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.stroke();
    if (TILE_IC[t.k]) { ctx.globalAlpha = t.k === 'spawn' ? .9 : .55; emoji(TILE_IC[t.k], x, y, s * .55); ctx.globalAlpha = 1 }
    if (path.has(id) && !B.bld[id] && t.k !== 'spawn') { ctx.fillStyle = 'rgba(248,113,113,.35)'; ctx.beginPath(); ctx.arc(x, y, s * .09, 0, 7); ctx.fill() }
  }
  /* 선택한 칸 */
  if (ui.selCell != null && ui.selCell >= 0) { const p = HEX.world(ui.selCell), [x, y] = toScr(p.x, p.y); hexPath(x, y, R * .97); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke() }
  /* 건물 */
  for (const b of B.blds) drawBuilding(b, ui);
  /* 일꾼 */
  for (const w of B.workers) { const [x, y] = toScr(w.x, w.y); ctx.fillStyle = w.carry ? (w.cr === 'B' ? RES.B.col : RES.A.col) : '#fde68a'; ctx.beginPath(); ctx.arc(x, y, s * .11, 0, 7); ctx.fill() }
  /* 지상 유닛·적 */
  for (const u of B.units) drawEntity(u, ui);
  for (const e of B.enemies) drawEntity(e, ui);
  /* 공중: 그림자(땅) + 띄운 몸 */
  for (const e of B.air) drawEntity(e, ui);
  /* 사거리 표시 */
  const se = ui.selEnt;
  if (se && se.st && se.st.range && (se.kind === 'unit' || se.id === 'turret')) { const p = wpos(se), [x, y] = toScr(p.x, p.y); ctx.strokeStyle = 'rgba(56,189,248,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, (se.st.range + .5) * SQ3 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]) }
  if (se && se.kind === 'unit' && se.home >= 0) { const p = HEX.world(se.home), [x, y] = toScr(p.x, p.y); hexPath(x, y, R * .8); ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.stroke() }
  /* 효과 */
  for (const f of B.fx) {
    const k = f.t / f.T;
    if (f.k === 'shot' || f.k === 'arc') { const [a, b] = toScr(f.x1, f.y1), [c, d] = toScr(f.x2, f.y2); ctx.strokeStyle = f.col; ctx.globalAlpha = k; ctx.lineWidth = f.k === 'arc' ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(a, b); if (f.k === 'arc') ctx.quadraticCurveTo((a + c) / 2, Math.min(b, d) - s * 1.2, c, d); else ctx.lineTo(c, d); ctx.stroke(); ctx.globalAlpha = 1 }
    if (f.k === 'ring') { const [x, y] = toScr(f.x, f.y); ctx.strokeStyle = f.col; ctx.globalAlpha = k; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, f.r * s * (1.1 - k * .3), 0, 7); ctx.stroke(); ctx.globalAlpha = 1 }
    if (f.k === 'txt' && ui.showDmg) { const [x, y] = toScr(f.x, f.y - (1 - k) * .6); ctx.globalAlpha = k; ctx.font = `bold ${Math.max(10, s * .38)}px sans-serif`; ctx.fillStyle = '#000'; ctx.fillText(f.s, x + 1, y + 1); ctx.fillStyle = f.col; ctx.fillText(f.s, x, y); ctx.globalAlpha = 1 }
  }
}
function drawBuilding(b, ui) {
  const s = CAM.s, p = HEX.world(b.cell), [x, y] = toScr(p.x, p.y);
  if (b.id === 'nexus') {
    hexPath(x, y, s * .92); const g = ctx.createRadialGradient(x, y, 2, x, y, s); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#1e3a8a'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = b.sh > 0 ? 'rgba(125,211,252,.9)' : '#334155'; ctx.lineWidth = 3; ctx.stroke(); emoji('💠', x, y, s * .8);
    bar(x, y + s * .7, s * 1.4, b.hp / b.mhp, '#ef4444', 4); bar(x, y + s * .7 + 5, s * 1.4, b.sh / b.msh, '#38bdf8', 3); return;
  }
  hexPath(x, y, s * .82); ctx.fillStyle = b.done ? '#475569' : 'rgba(71,85,105,.5)'; ctx.fill(); ctx.strokeStyle = ui.selEnt === b ? '#facc15' : '#94a3b8'; ctx.lineWidth = ui.selEnt === b ? 2.5 : 1.5; ctx.stroke();
  ctx.globalAlpha = b.done ? 1 : .55; emoji(b.def.ic, x, y, s * .72); ctx.globalAlpha = 1;
  if (!b.done) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, s * .55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.prog / b.def.time)); ctx.stroke() }
  if (b.queue && b.queue.length) { const q = b.queue[0]; bar(x, y + s * .55, s, 1 - q.t / UNITS[q.u].time, '#facc15', 3) }
  if (b.hp < b.mhp) bar(x, y - s * .75, s * .9, b.hp / b.mhp, '#ef4444');
}
function drawEntity(e, ui) {
  const s = CAM.s, p = wpos(e); let [x, y] = toScr(p.x, p.y); const boss = e.def.boss, r = s * (boss ? .62 : e.kind === 'unit' ? .42 : .36);
  if (e.air) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x, y + s * .25, r * .9, r * .35, 0, 0, 7); ctx.fill(); y -= s * (.45 + Math.sin(B.t * 4 + e.uid) * .05) }
  else { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y + r * .8, r * .8, r * .25, 0, 0, 7); ctx.fill() }
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  if (e.kind === 'unit') { ctx.fillStyle = (RACES[e.def.race] || HYBRIDS[e.def.race] && RACES.granite || RACES.iron).col; ctx.fill(); ctx.strokeStyle = ui.selEnt === e ? '#facc15' : '#e0f2fe'; ctx.lineWidth = ui.selEnt === e ? 3 : 1.5; ctx.stroke() }
  else { ctx.fillStyle = boss ? '#7f1d1d' : e.air ? '#3f6212' : '#4d1d1d'; ctx.fill(); ctx.strokeStyle = ui.selEnt === e ? '#facc15' : (boss ? '#fca5a5' : '#a3e635'); ctx.lineWidth = ui.selEnt === e ? 3 : 1.5; ctx.stroke() }
  emoji(e.def.ic, x, y + 1, r * 1.15);
  if (e.sh > 0) { ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke() }
  if (e.hp < e.mhp || boss) bar(x, y - r - 6, r * 2.2, e.hp / e.mhp, e.team === 'p' ? '#4ade80' : '#f87171', boss ? 5 : 3);
}
