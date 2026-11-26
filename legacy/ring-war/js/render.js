/* 공명 전쟁 — 2D 도트 판 그리기. 작은 캔버스(7x10칸 × 16px)에 그리고 CSS로 확대(image-rendering: pixelated) */
'use strict';
const CS = 16;
function drawBoard(ctx, p, o) {
  o = o || {};
  ctx.imageSmoothingEnabled = false;
  const W = COLS * CS, H = ROWS * CS;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    ctx.fillStyle = y === 0 ? '#2b2140' : y === ROWS - 1 ? '#40212c' : (x + y) % 2 ? '#1c2230' : '#212838';
    ctx.fillRect(x * CS, y * CS, CS, CS);
  }
  /* 걷는 길 점선 */
  ctx.fillStyle = 'rgba(250,204,21,.28)';
  for (const [x, y] of pathCells(p)) ctx.fillRect(x * CS + 7, y * CS + 7, 2, 2);
  /* 출발/도착 표시 */
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(SPAWN_X * CS + 5, 6, 6, 2);
  ctx.fillStyle = 'rgba(255,120,120,.4)'; for (let x = 0; x < COLS; x++) ctx.fillRect(x * CS + 4, H - 7, 8, 2);
  /* 타워 */
  for (const t of p.towers) {
    ctx.drawImage(defSprite(t.def), t.x * CS, t.y * CS, CS, CS);
    ctx.fillStyle = '#facc15'; for (let i = 1; i < t.lv; i++) ctx.fillRect(t.x * CS + 2 + (i - 1) * 3, t.y * CS + CS - 3, 2, 2);
  }
  /* 선택한 타워/칸의 사거리 */
  if (o.sel) {
    const t = p.grid[o.sel.y] && p.grid[o.sel.y][o.sel.x];
    const d = t ? t.def : o.tool ? T[o.tool] : null;
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1; ctx.strokeRect(o.sel.x * CS + .5, o.sel.y * CS + .5, CS - 1, CS - 1);
    if (d && d.rng) { ctx.strokeStyle = 'rgba(56,189,248,.7)'; ctx.beginPath(); ctx.arc((o.sel.x + .5) * CS, (o.sel.y + .5) * CS, (d.rng + (t ? .1 * (t.lv - 1) : 0)) * CS, 0, 7); ctx.stroke() }
  }
  /* 유닛: 아래쪽부터 그려서 겹침 정리, 공중은 그림자+띄우기 */
  const us = p.units.filter(u => u.delay <= 0).sort((a, b) => (a.air - b.air) || a.y - b.y), bob = performance.now() / 200;
  for (const u of us) {
    const px = u.x * CS, py = u.y * CS, lift = u.air ? 5 + Math.sin(bob + u.id) * 1.2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,' + (u.air ? .25 : .4) + ')'; ctx.fillRect(Math.round(px - 5), Math.round(py + 5), 10, 2);
    ctx.drawImage(defSprite(u.def), Math.round(px - 8), Math.round(py - 8 - lift), CS, CS);
    ctx.fillStyle = PC[u.owner]; ctx.fillRect(Math.round(px - 4), Math.round(py + 7), 8, 1);
    const f = Math.max(0, Math.min(1, u.hp / u.mhp));
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(px - 6), Math.round(py - 10 - lift), 12, 2);
    ctx.fillStyle = f > .5 ? '#4ade80' : f > .25 ? '#facc15' : '#f87171'; ctx.fillRect(Math.round(px - 6), Math.round(py - 10 - lift), Math.max(1, Math.round(12 * f)), 2);
    if (u.poisT > 0) { ctx.fillStyle = '#a3e635'; ctx.fillRect(Math.round(px + 5), Math.round(py - 9 - lift), 2, 2) }
    if (u.slowT > 0) { ctx.fillStyle = '#e5e7eb'; ctx.fillRect(Math.round(px + 5), Math.round(py - 6 - lift), 2, 2) }
  }
  /* 사격선 */
  for (const f of p.fx) { ctx.strokeStyle = f.col; ctx.beginPath(); ctx.moveTo(f.x1 * CS, f.y1 * CS); ctx.lineTo(f.x2 * CS, f.y2 * CS); ctx.stroke() }
  if (!p.alive) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H) }
}
