/* 전투 화면: 상단 HUD · 웨이브 상자 · 대기석 · 정보 · 하단 탭(건물/유닛/기술/넥서스/일꾼) · 터치 입력 · 게임 루프 */
'use strict';
const UI = { tab: 'bld', tool: null, selEnt: null, selCell: -1, spd: 1, paused: false, last: 0, uiT: 0, running: false, ended: false };
function startStage(sid) {
  newBattle(sid, SV.diff, { meta: SV.meta, hybrid: SV.hyb });
  Object.assign(UI, { tab: 'bld', tool: null, selEnt: null, selCell: -1, spd: SV.set.spd, paused: false, ended: false });
  show('battle'); renderInit($('cv')); CAM.fit = true; camFit(); renderPanel(); hud();
  $('bSpd').textContent = UI.spd + 'x'; $('bPause').textContent = '⏸';
  const st = STAGES[sid];
  if (!SV.seen[sid]) { SV.seen[sid] = 1; writeSave(); UI.paused = true; dialog(st.intro, () => { UI.paused = false }) }
  if (!UI.running) { UI.running = true; UI.last = performance.now(); requestAnimationFrame(loop) }
}
function loop(now) {
  const dt = Math.min(.1, (now - UI.last) / 1000); UI.last = now;
  if (!$('battle').classList.contains('hide') && B) {
    if (!UI.paused && !modalOpen() && !B.result) { let r = dt * UI.spd; while (r > 0) { const d = Math.min(.05, r); stepBattle(d); r -= d } }
    if (UI.selEnt && UI.selEnt.hp <= 0) UI.selEnt = null;
    drawBattle({ tool: UI.tool, selEnt: UI.selEnt, selCell: UI.selCell, showDmg: SV.set.dmg });
    UI.uiT -= dt; if (UI.uiT <= 0) { UI.uiT = .25; hud(); refreshPanel() }
    if (B.phase === 'reward' && !modalOpen()) openBoons();
    if (B.result && !UI.ended) { UI.ended = true; setTimeout(openEnd, 600) }
  }
  requestAnimationFrame(loop);
}
let toastT = 0;
function toast(m) { if (!m) return; const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600) }
const act = r => { if (r) toast(r); else { hud(); renderPanel() } return !r };

/* ── 상단·웨이브 상자·대기석 ── */
function hud() {
  const nx = B.nexus;
  $('tA').textContent = fmt(B.res.A); $('tB').textContent = fmt(B.res.B);
  $('tHp').style.width = 100 * Math.max(0, nx.hp) / nx.mhp + '%'; $('tSh').style.width = 100 * nx.sh / nx.msh + '%';
  $('tHpT').textContent = `💠 Lv.${nx.lv} ${fmt(Math.max(0, nx.hp))}${nx.sh > 1 ? ' +🛡' + fmt(nx.sh) : ''}`;
  $('tWave').textContent = B.phase === 'prep' ? `🌊 다음 ${B.wave + 2}/${B.st.waves.length}` : `🌊 ${B.wave + 1}/${B.st.waves.length}`;
  $('tStage').textContent = `${B.st.n} · ${B.D.n}${B.hybrid ? ' · 🔗 ' + HYBRIDS[B.hybrid].n : ''}`;
  let w = '';
  if (B.phase === 'prep') {
    const nw = B.st.waves[B.wave + 1], cnt = {}; nw.g.forEach(g => cnt[g.e] = (cnt[g.e] || 0) + g.n);
    w = `<b>⏳ 준비 ${Math.ceil(B.prepT)}초</b> · 다음 웨이브 ${B.wave + 2}<br>${Object.entries(cnt).map(([e, n]) => `${ENEMIES[e].ic}×${n}`).join(' ')}<br><button id="bWave">⚔️ 지금 시작 (+${Math.floor(B.prepT) * 2}🔷)</button>`;
  } else if (B.phase === 'wave') w = `<b>🌊 웨이브 ${B.wave + 1} 진행</b><br>남은 적 ${B.enemies.length + B.air.length + B.spawnQ.length}`;
  $('waveBox').innerHTML = w;
  if ($('bWave')) $('bWave').onclick = () => act(startWave());
  $('synBox').innerHTML = B.syn.filter(a => a.c > 0).map(a => `<span class="${a.tier ? 'on' : ''}">${a.s.ic}${a.c}/${(a.s.tiers.find(t => t.n > a.c) || a.s.tiers[a.s.tiers.length - 1]).n}</span>`).join('');
  $('bench').innerHTML = B.bench.length ? `<span class="lb">대기석</span>` + B.bench.map(u => `<button class="bu ${UI.tool && UI.tool.uid === u.uid ? 'on' : ''}" data-u="${u.uid}">${u.def.ic}</button>`).join('') : `<span class="lb">대기석이 비었어요 — 병영에서 유닛을 뽑으면 여기 나와요</span>`;
  for (const b of $('bench').querySelectorAll('[data-u]')) b.onclick = () => { const uid = +b.dataset.u; UI.tool = UI.tool && UI.tool.uid === uid ? null : { k: 'place', uid }; UI.selEnt = null; info(); hud() };
  info();
}
/* ── 정보(선택한 것) ── */
function info() {
  const e = UI.selEnt; let h = '';
  if (UI.tool && UI.tool.k === 'build') h = `<b>${BUILDINGS[UI.tool.id].n}</b> 짓기 — 초록 칸을 눌러요. ${BUILDINGS[UI.tool.id].d}`;
  else if (UI.tool && UI.tool.k === 'place') { const u = B.bench.find(x => x.uid === UI.tool.uid); h = u ? `<b>${u.def.n}</b> 배치 — 초록 칸을 눌러요. 탱커는 앞, 원거리는 뒤! 공격⚔·방어🛡·고지대⛰ 타일은 보너스` : '' }
  else if (e && e.kind === 'unit') { const s = e.st; h = `<b>${e.def.ic} ${e.def.n}</b> (${roleKo(e.def.role)}) ❤️${fmt(e.hp)}/${fmt(e.mhp)}${e.sh > 0 ? ' 🛡' + fmt(e.sh) : ''} · ${e.def.heal ? '💚치유 ' + s.heal : '⚔️' + s.atk.toFixed(0)} · ⏱${s.as.toFixed(2)}/초 · 📏${s.range} · 🛡${s.armor}<br>${e.def.d}${B.phase !== 'wave' ? `<br><button id="iBack">대기석으로</button> <span>다른 빈 칸을 누르면 그 자리로 옮겨요</span>` : ''}` }
  else if (e && e.kind === 'enemy') h = `<b>${e.def.ic} ${e.def.n}</b> ❤️${fmt(e.hp)}/${fmt(e.mhp)} · ⚔️${e.atk.toFixed(0)} · 🛡${e.armor}${e.air ? ' · 🪽비행' : ''}<br>${e.def.d}`;
  else if (e && e.kind === 'bld') {
    if (e.id === 'nexus') h = `<b>💠 넥서스 Lv.${e.lv}</b> ❤️${fmt(e.hp)}/${fmt(e.mhp)} 🛡${fmt(e.sh)}/${e.msh} · ⚡${Math.floor(e.energy)}/100 — 넥서스 탭에서 강화·파동`;
    else h = `<b>${e.def.ic} ${e.def.n}</b> ❤️${fmt(e.hp)}/${fmt(e.mhp)}${e.done ? '' : ` · 🏗 건설 중 ${Math.ceil(e.prog)}초`}${e.st && e.st.atk ? ` · ⚔️${e.st.atk.toFixed(0)} 📏${e.st.range}` : ''}${e.queue && e.queue.length ? `<br>생산: ${e.queue.map(q => UNITS[q.u].ic).join(' ')}` : ''}<br>${e.def.d}`;
  } else if (UI.selCell >= 0) { const t = B.tiles[UI.selCell]; h = `<b>${t.n}</b>${t.d ? ' — ' + t.d : ''}` }
  else h = '탭: 선택 · 길게: 정보 · 드래그: 이동 · 두 손가락: 확대';
  $('info').innerHTML = h;
  if ($('iBack')) $('iBack').onclick = () => { if (act(actUnplace(e.uid))) { UI.selEnt = null; info() } };
}
const roleKo = r => ({ tank: '탱커', melee: '근접', ranged: '원거리', support: '지원', siege: '공성' })[r] || r;

/* ── 하단 탭 ── */
for (const b of document.querySelectorAll('#tabs button')) b.onclick = () => { UI.tab = b.dataset.tab; UI.tool = null; renderPanel(); hud() };
const it = (key, ic, name, sub, on, cls) => `<button class="it ${cls || ''} ${on ? 'on' : ''}" data-k="${key}"><i>${ic}</i>${name}<small>${sub}</small></button>`;
const pbar = f => `<div class="pb"><i style="width:${clamp(f, 0, 1) * 100}%"></i></div>`;
function renderPanel() {
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === UI.tab);
  let h = '';
  if (UI.tab === 'bld') {
    h = Object.entries(BUILDINGS).map(([k, d]) => it('b:' + k, d.ic, d.n, costTxt(d.cost), UI.tool && UI.tool.id === k)).join('');
    h += `<div class="wide">건물을 고른 뒤 지도의 초록 칸을 눌러요. 정수 추출기는 🟣 분출구에만. 적이 다니는 길(빨간 점)을 막으면 적이 건물을 부수며 지나가요.</div>`;
  } else if (UI.tab === 'unit') {
    const bars = B.blds.filter(b => b.id === 'barracks');
    h = Object.entries(UNITS).filter(([k, d]) => !d.req || !d.req.hybrid || B.hybrid === d.req.hybrid).map(([k, d]) => { const lock = unitLock(k); return it('u:' + k, d.ic, d.n, lock ? '🔒 ' + lock : costTxt(d.cost), false, lock ? 'off' : '') }).join('');
    h += `<div class="wide">${bars.length ? bars.map((b, i) => `🏰 병영 ${i + 1}${b.done ? '' : ' (건설 중)'}: ${b.queue.map(q => UNITS[q.u].ic).join(' ') || '대기 없음'}${b.queue.length ? pbar(1 - b.queue[0].t / UNITS[b.queue[0].u].time) : ''}`).join('<br>') : '⚠️ 병영이 없어요 — 건물 탭에서 먼저 지어요'}<br>다 만든 유닛은 위 <b>대기석</b>에 나와요(최대 ${BENCH_MAX}). 대기석 유닛을 누르고 칸을 눌러 배치!</div>`;
  } else if (UI.tab === 'tech') {
    h = Object.entries(TECH).map(([k, t]) => { const lock = techLock(k), doing = B.research && B.research.id === k; return it('t:' + k, ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][t.tier], t.n, doing ? '연구 중 ' + Math.ceil(B.research.t) + '초' : lock === '완료' ? '✅ 완료' : lock ? '🔒 ' + lock : costTxt(t.cost), doing, lock && lock !== '완료' ? 'off' : '') }).join('');
    h += `<div class="wide">${B.research ? `🔬 ${TECH[B.research.id].n}${pbar(1 - B.research.t / B.research.T)}` : '연구는 넥서스에서 한 번에 하나씩. 버튼을 길게 누르면 효과를 볼 수 있어요.'}</div>`;
  } else if (UI.tab === 'nexus') {
    const nx = B.nexus, L = NEXUS.lv[nx.lv + 1];
    h = it('n:wave', '🌊', '아르카 파동', `⚡${Math.floor(nx.energy)}/100`, false, nx.energy < 100 ? 'off' : '');
    h += it('n:up', '⬆', L ? `레벨 ${nx.lv + 1}` : '최고 레벨', B.nexusUp ? `강화 중 ${Math.ceil(B.nexusUp.t)}초` : L ? (L.ready ? costTxt(L.cost) : '🔒 준비 중') : '-', false, !L || !L.ready ? 'off' : '');
    if (B.hybrid && ULT[B.hybrid]) h += it('n:ult', HYBRIDS[B.hybrid].ic, ULT[B.hybrid].n, B.ultCd > 0 ? `대기 ${Math.ceil(B.ultCd)}초` : costTxt(ULT[B.hybrid].cost), false, B.ultCd > 0 ? 'off' : '');
    h += `<div class="wide">💠 Lv.${nx.lv} · ❤️${fmt(nx.hp)}/${fmt(nx.mhp)} · 🛡${fmt(nx.sh)}/${nx.msh} (6초간 안 맞으면 회복)<br>파동: 주변 3칸 적에게 ${Math.round(NEXUS.wave.dmg * (1 + (B.fx0.waveMul || 0)))} 피해 + 보호막 ${NEXUS.wave.shield}<br>${L ? `다음 레벨: ${L.d}` : ''}${B.nexusUp ? pbar(1 - B.nexusUp.t / B.nexusUp.T) : ''}${B.hybrid ? `<br>🔗 ${HYBRIDS[B.hybrid].n} 패시브: ${HYBRIDS[B.hybrid].passive}` : ''}<br>시너지: ${B.syn.filter(a => a.tier).map(a => a.s.ic + a.s.n + ' ' + a.tier.d).join(' · ') || '없음(같은 종족·역할을 2명 이상 배치해 보세요)'}</div>`;
  } else if (UI.tab === 'wk') {
    const nB = B.workers.filter(w => w.job === 'B').length, hasB = bNodes().length > 0;
    h = it('w:make', '⛏', '일꾼 생산', `${costTxt(WORKER.cost)} · ${B.workers.length + B.wq}/${workerCap()}`, false, B.workers.length + B.wq >= workerCap() ? 'off' : '');
    h += it('w:b-', '➖', '정수 담당', `목표 ${B.wantB}명`, false) + it('w:b+', '➕', '정수 담당', hasB ? `지금 ${nB}명` : '🔒 추출기 필요', false, hasB ? '' : 'off');
    h += `<div class="wide">⛏ 일꾼 ${B.workers.length}명 (🔷루멘 ${B.workers.length - nB} · 🟣정수 ${nB})${B.wq ? ` · 생산 대기 ${B.wq}${pbar(1 - B.wqT / WORKER.time)}` : ''}<br>광맥 하나에 한 명씩만 캘 수 있어요 — 너무 많이 보내면 줄을 서요. 정수는 🟣분출구에 <b>정수 추출기</b>를 지어야 캘 수 있어요.</div>`;
  }
  $('panel').innerHTML = h;
}
function refreshPanel() { if (UI.tab !== 'bld') renderPanel() }
$('panel').addEventListener('click', e => {
  const b = e.target.closest('.it'); if (!b) return; const [k, id] = b.dataset.k.split(':');
  if (k === 'b') { UI.tool = UI.tool && UI.tool.id === id ? null : { k: 'build', id }; UI.selEnt = null; renderPanel(); info() }
  else if (k === 'u') { const bars = B.blds.filter(x => x.id === 'barracks' && x.done).sort((a, c) => a.queue.length - c.queue.length); act(bars.length ? actTrain(bars[0].uid, id) : (B.blds.some(x => x.id === 'barracks') ? '병영을 짓는 중이에요' : '병영을 먼저 지어요')) }
  else if (k === 't') act(actResearch(id));
  else if (k === 'n') act(id === 'wave' ? actNexusWave() : id === 'up' ? actNexusUp() : actUlt());
  else if (k === 'w') act(id === 'make' ? actWorker() : actWantB(B.wantB + (id === 'b+' ? 1 : -1)));
});
/* 버튼 길게 누르기 = 설명 */
let lpT = 0;
$('panel').addEventListener('pointerdown', e => { const b = e.target.closest('.it'); if (!b) return; clearTimeout(lpT); lpT = setTimeout(() => { const [k, id] = b.dataset.k.split(':'); const d = k === 'b' ? BUILDINGS[id] : k === 'u' ? UNITS[id] : k === 't' ? TECH[id] : null; if (d) toast(`${d.n}: ${d.d}`) }, 450) });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('panel').addEventListener(ev, () => clearTimeout(lpT));

/* ── 지도 터치: 탭·길게·드래그·핀치·휠 ── */
const PT = new Map(); let drag = null, pinch = null, lp = 0, moved = false;
const cv = $('cv');
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); PT.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
  if (PT.size === 1) { drag = { x: e.clientX, y: e.clientY, ox: CAM.ox, oy: CAM.oy }; clearTimeout(lp); lp = setTimeout(() => { if (!moved) { const c = cellAt(e); if (c >= 0) longInfo(c) } }, 480) }
  if (PT.size === 2) { const [a, b] = [...PT.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: CAM.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; clearTimeout(lp) }
});
cv.addEventListener('pointermove', e => {
  if (!PT.has(e.pointerId)) return; PT.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PT.size === 2 && pinch) { const [a, b] = [...PT.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.mx, pinch.my, pinch.s * d / pinch.d / CAM.s); moved = true; return }
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 8) { moved = true; clearTimeout(lp) } if (moved) { CAM.ox = drag.ox + dx; CAM.oy = drag.oy + dy; CAM.fit = false } }
});
cv.addEventListener('pointerup', e => { clearTimeout(lp); const was = PT.size; PT.delete(e.pointerId); if (PT.size < 2) pinch = null; if (was === 1 && !moved) { const c = cellAt(e); tapCell(c) } if (!PT.size) drag = null });
cv.addEventListener('pointercancel', e => { PT.delete(e.pointerId); drag = null; pinch = null });
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15) }, { passive: false });
function zoomAt(cx, cy, f) { const r = cv.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, ns = clamp(CAM.s * f, 12, 90), k = ns / CAM.s; CAM.ox = x - (x - CAM.ox) * k; CAM.oy = y - (y - CAM.oy) * k; CAM.s = ns; CAM.fit = false }
$('zIn').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25) };
$('zOut').onclick = () => { const r = cv.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.25) };
$('zFit').onclick = () => { CAM.fit = true; camFit() };
window.addEventListener('resize', () => { if (cvs) resizeCanvas() });
function cellAt(e) { const r = cv.getBoundingClientRect(), [x, y] = toWorld(e.clientX - r.left, e.clientY - r.top); return HEX.pick(x, y) }
/* 공중 적은 화면 위치로 찾기 */
function airAt(e) { const r = cv.getBoundingClientRect(), [x, y] = toWorld(e.clientX - r.left, e.clientY - r.top + CAM.s * .45); return B.air.find(a => Math.hypot(a.x - x, a.y - y) < .8) }
function tapCell(c) {
  if (!B || B.result || c < 0) return;
  if (UI.tool && UI.tool.k === 'build') { if (act(actBuild(UI.tool.id, c))) { if (!canPay(B.res, BUILDINGS[UI.tool.id].cost)) UI.tool = null; renderPanel() } info(); return }
  if (UI.tool && UI.tool.k === 'place') { if (act(actPlace(UI.tool.uid, c))) { UI.selEnt = B.units.find(u => u.uid === UI.tool.uid); UI.tool = null } hud(); return }
  /* 선택한 배치 유닛 + 빈 칸 → 자리 옮기기 */
  const occ = B.occ[c], bl = B.bld[c];
  if (UI.selEnt && UI.selEnt.kind === 'unit' && !occ && !bl && B.tiles[c].place) { if (act(actPlace(UI.selEnt.uid, c))) { } info(); return }
  UI.selEnt = occ || bl || null; UI.selCell = UI.selEnt ? -1 : c; info();
}
function longInfo(c) { const occ = B.occ[c], bl = B.bld[c]; UI.selEnt = occ || bl || null; UI.selCell = UI.selEnt ? -1 : c; info(); const t = B.tiles[c]; toast(UI.selEnt ? `${UI.selEnt.def.n}: ${UI.selEnt.def.d || ''}` : `${t.n}${t.d ? ' — ' + t.d : ''}`) }

/* ── 조작 버튼 ── */
$('bPause').onclick = () => { UI.paused = !UI.paused; $('bPause').textContent = UI.paused ? '▶' : '⏸' };
$('bSpd').onclick = () => { UI.spd = UI.spd === 1 ? 2 : UI.spd === 2 ? 3 : 1; $('bSpd').textContent = UI.spd + 'x' };
$('bQuit').onclick = () => openModal(`<h2>일시 정지</h2><div class="btns"><button onclick="closeModal()">계속하기</button><button id="qRe">다시 시작</button><button id="qMap" class="go">지도로 (포기)</button></div>`) || (
  $('qRe').onclick = () => { closeModal(); startStage(B.sid) }, $('qMap').onclick = () => { closeModal(); B.result = 'quit'; UI.ended = true; show('map') });

/* ── 보상 카드 · 결과 ── */
function openBoons() {
  openModal(`<h2>✅ 웨이브 ${B.wave + 1} 방어! — 강화 하나를 고르세요</h2><div class="boons">${B.boonChoice.map(k => `<button data-b="${k}"><i>${BOONS[k].ic}</i><b>${BOONS[k].n}</b> — ${BOONS[k].d}</button>`).join('')}</div>`, true);
  for (const b of $('mBody').querySelectorAll('[data-b]')) b.onclick = () => { actBoon(b.dataset.b); closeModal(); hud(); renderPanel() };
}
function openEnd() {
  const win = B.result === 'win'; if (B.result === 'quit') return;
  const got = win ? recordClear(B.sid, B.diff, B.t) : [];
  const body = `<h2>${win ? '🏆 스테이지 클리어!' : '💥 넥서스 파괴 — 패배'}</h2>
    <div class="card small">⏱ ${Math.floor(B.t / 60)}분 ${Math.floor(B.t % 60)}초 · 처치 ${B.stats.kills} · 잃은 유닛 ${B.stats.lost} · 지은 건물 ${B.stats.built} · 웨이브 ${B.wave + 1}/${B.st.waves.length}</div>
    ${got.length ? `<div class="card small">${got.join('<br>')}</div>` : ''}${win ? '' : '<p class="small">팁: 탱커를 길 위에, 원거리를 뒤에. 공중(🦟) 대비로 소총병·수호탑, 공성충(🐌)은 빨리 처리하세요.</p>'}
    <div class="btns"><button id="eRe">다시 하기</button><button id="eMap" class="go">지도로</button></div>`;
  const fin = () => { openModal(body, true); $('eRe').onclick = () => { closeModal(); startStage(B.sid) }; $('eMap').onclick = () => { closeModal(); show('map') } };
  if (win && B.st.outro && !SV.seen[B.sid + '_out']) { SV.seen[B.sid + '_out'] = 1; writeSave(); dialog(B.st.outro, fin) } else fin();
}

/* 시작 */
loadSave(); show('menu');
