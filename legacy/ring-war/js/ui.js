/* 공명 전쟁 — 화면 조작(제목·게임·팝업) */
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const cv = $('cv'), cx = cv.getContext('2d');
let raceSel = 'human', tab = 't', tool = null, sel = null, spd = 1, paused = false, last = 0, running = false, uiT = 0, toastT = 0;
const SAVE = 'resonance_war_v1';
try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && RACES[s.race] && RACES[s.race].play) raceSel = s.race } catch (e) { /* 무시 */ }

const INTRO = '대균열이 하늘을 찢던 날, 일곱 세계가 부서져 하나의 거대한 고리로 이어졌습니다. 고리 위의 여덟 영지는 서로를 이웃이자 적으로 마주하고, 한 영지의 군대는 다음 영지로 흘러듭니다. 균열이 남긴 공명석 곁에서 두 종족의 힘이 하나로 합쳐질 때, 전쟁은 새로운 국면을 맞습니다.';
$('intro').textContent = INTRO;

/* ───── 제목 ───── */
function renderTitle() {
  $('rgrid').innerHTML = RK.map(k => `<button data-k="${k}" class="${RACES[k].play ? (k === raceSel ? 'on' : '') : 'off'}"><i>${RACES[k].ic}</i>${RACES[k].n}</button>`).join('');
  const r = RACES[raceSel];
  $('rdet').innerHTML = `<b style="color:${r.col}">${r.ic} ${r.n}</b> · ${r.tag}<br>${r.d}<br>⚠️ ${r.weak}<br>🏗 전용 타워: ${Object.values(T).filter(t => t.r.length === 1 && t.r[0] === raceSel).map(t => t.n).join(', ')}<br>🐾 전용 유닛: ${Object.values(U).filter(u => u.r.length === 1 && u.r[0] === raceSel).map(u => u.n).join(', ')}`;
}
$('rgrid').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, r = RACES[k];
  if (!r.play) { $('rdet').innerHTML = `<b style="color:${r.col}">${r.ic} ${r.n}</b> · ${r.tag}<br>${r.d}<br>⚠️ ${r.weak}<br>🛠 아직 만드는 중이에요. 곧 만나요!`; return }
  raceSel = k; renderTitle();
};
$('bStart').onclick = () => {
  try { localStorage.setItem(SAVE, JSON.stringify({ race: raceSel })) } catch (e) { /* 무시 */ }
  startGame();
};

/* ───── 게임 ───── */
function startGame() {
  newGame({ race: raceSel, gap: +$('dif').value });
  S.onReson = openReson;
  tool = null; sel = null; tab = 't'; spd = 1; paused = false;
  $('bSpd').textContent = '1x'; $('bPause').textContent = '⏸';
  show('game'); renderAll(); last = performance.now();
  if (!running) { running = true; requestAnimationFrame(loop) }
}
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.add('hide'); $(id).classList.remove('hide') }
function loop(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!$('game').classList.contains('hide') && S) {
    if (!paused && !S.over && !modalOpen()) { let r = dt * spd; while (r > 0) { const d = Math.min(.05, r); step(d); r -= d } }
    cx.clearRect(0, 0, cv.width, cv.height);
    drawBoard(cx, S.pl[S.view], S.view === 0 ? { sel, tool } : {});
    uiT -= dt; if (uiT <= 0) { uiT = .25; renderHud(); renderStrip(); refreshItems() }
    if (S.over && !S.shown) { S.shown = true; openEnd() }
  }
  requestAnimationFrame(loop);
}
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600) }
const me = () => S.pl[0];

function renderHud() {
  const p = me(), v = S.pl[S.view], m = S.t;
  $('hTime').textContent = `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  $('hGold').textContent = '💰 ' + fmt(p.gold);
  $('hInc').textContent = `+${fmt(p.income)}/${TICK}초`;
  const lm = lateMul(m); $('hLate').textContent = lm > 1 ? `⚠️탈출피해×${lm}` : '';
  $('hLifeB').style.width = p.life + '%'; $('hLife').textContent = `❤️ ${Math.ceil(p.life)}`;
  $('hName').textContent = S.view === 0 ? `${RACES[p.race].ic} 내 판${p.race2 ? ' · 공명: ' + RACES[p.race2].ic + RACES[p.race2].n : ''}` : `👀 ${v.name} 판 구경 중 ${RACES[v.race].ic}${RACES[v.race].n} (아래에서 '나'를 누르면 돌아와요)`;
}
function renderStrip() {
  const nx = nextAlive(0);
  $('pstrip').innerHTML = S.pl.map(p => `<div class="pc ${p.id === S.view ? 'on' : ''} ${p.alive ? '' : 'dead'} ${p.id === nx ? 'next' : ''}" data-i="${p.id}" style="color:${PC[p.id]}">${RACES[p.race].ic}<br>${p.id ? p.id + 1 : '나'}<u style="width:${Math.max(0, p.life) * .9}%"></u></div>`).join('');
}
$('pstrip').onclick = e => { const c = e.target.closest('.pc'); if (!c) return; S.view = +c.dataset.i; sel = null; renderAll() };

/* 아래 패널 */
const descT = d => [d.d ? `⚔️${d.d}` : '', d.rng ? `📏${d.rng}` : '', d.cd ? `⏱${d.cd}s` : '', d.t ? (d.t === 'GA' ? '지상·공중' : d.t === 'G' ? '지상만' : '공중만') : '',
  d.poison ? `☠️독 ${d.poison[0]}/초` : '', d.slow ? `🕸감속 ${Math.round((1 - d.slow[0]) * 100)}%` : '', d.pierce ? (d.pierce >= 1 ? '장갑 무시' : '장갑 절반 무시') : '', d.shred ? `장갑 -${d.shred}씩` : '', d.gold ? `🪙+${d.gold}` : '', d.inc ? `📈인컴+${d.inc}` : '', d.x || ''].filter(Boolean).join(' · ');
const descU = d => [`❤️${d.hp}`, `💨${d.sp}`, d.air ? '🪽공중' : '🦶지상', d.armor ? `🛡${d.armor}` : '', `💥피해${d.dm}`, `📈인컴+${d.inc}`, d.x || ''].filter(Boolean).join(' · ');
function itemBtn(id, d, kind) {
  const p = me(), c = kind === 'u' ? d.c : d.c, ok = p.gold >= c;
  return `<button class="it ${d.r.length === 2 ? 'combo' : ''} ${ok ? '' : 'nogold'} ${tool === id && kind === 't' ? 'sel' : ''}" data-k="${kind}" data-id="${id}">${d.r.length === 2 ? '<em>조합</em>' : ''}<img src="${defURL(d)}"><span>${d.n}</span><br><span class="cost">${c}G</span></button>`;
}
function renderAll() { renderHud(); renderStrip(); renderItems(); renderTabs(); drawNow() }
function drawNow() { cx.clearRect(0, 0, cv.width, cv.height); drawBoard(cx, S.pl[S.view], S.view === 0 ? { sel, tool } : {}) }
function renderTabs() { for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === tab) }
$('tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; tool = null; sel = null; renderAll() };
function renderItems() {
  const p = me(); let h = '';
  if (tab === 't') { h = availT(p).map(k => itemBtn(k, T[k], 't')).join(''); $('info').innerHTML = tool ? `<b>${T[tool].n}</b> — ${descT(T[tool])}<br>빈 칸을 눌러 지어요` : '타워를 고른 뒤 내 판의 빈 칸을 눌러요. 지은 타워를 누르면 강화·판매할 수 있어요.' }
  else if (tab === 'u') {
    h = availU(p).map(k => itemBtn(k, U[k], 'u')).join('');
    h += `<button class="it ${p.gold >= ulvCost(p.ulv) && p.ulv < 10 ? '' : 'nogold'}" data-k="g"><img src="${defURL(U[availU(p)[0]] || U.militia)}" style="opacity:.0;height:2px"><span>⬆ 군단 강화 Lv.${p.ulv}</span><br><span class="cost">${p.ulv < 10 ? ulvCost(p.ulv) + 'G' : 'MAX'}</span></button>`;
    const nx = nextAlive(0); $('info').innerHTML = `유닛을 누르면 <b>${nx === null ? '-' : S.pl[nx].name + ' 판'}</b>(다음 사람)으로 보내요. 군단 강화: 내 유닛 체력 +15%씩(최대 10단계).`;
  } else {
    $('info').innerHTML = S.reson ? '' : `⏳ 공명까지 ${Math.max(0, Math.ceil(RESON_T - S.t))}초`;
    h = `<div style="grid-column:1/-1;font-size:13px;line-height:1.6;color:var(--dim)">${p.race2 ? `🔗 공명 완료: <b style="color:var(--tx)">${comboName(p.race, p.race2)}</b>` : S.reson ? '아직 두 번째 종족을 고르지 않았어요.' : '1분 30초가 되면 두 번째 종족을 고를 수 있어요.'}</div>`;
    if (S.reson && !p.race2) h += `<button class="it" data-k="r" style="grid-column:1/-1">🔗 두 번째 종족 고르기</button>`;
    const co = [...Object.values(T), ...Object.values(U)].filter(d => d.r.length === 2);
    h += co.map(d => `<div style="grid-column:1/-1;font-size:12px;color:${allowed(d, p.race, p.race2) ? 'var(--tx)' : 'var(--dim)'}"><img src="${defURL(d)}" style="width:20px;height:20px;image-rendering:pixelated;vertical-align:middle"> ${allowed(d, p.race, p.race2) ? '✅' : '🔒'} ${RACES[d.r[0]].ic}${RACES[d.r[1]].ic} <b>${d.n}</b> — ${d.hp ? descU(d) : descT(d)}</div>`).join('');
  }
  $('items').innerHTML = h;
}
function refreshItems() { /* 골드 부족 표시만 갱신(전체 다시 그리면 버튼이 깜빡여요) */
  const p = me(); let n = 0;
  for (const b of $('items').querySelectorAll('.it')) {
    const k = b.dataset.k; if (k === 'r') continue; n++;
    const c = k === 'g' ? (p.ulv < 10 ? ulvCost(p.ulv) : 1e9) : (k === 'u' ? U : T)[b.dataset.id].c;
    b.classList.toggle('nogold', p.gold < c);
    if (k === 'g') b.innerHTML = `<span>⬆ 군단 강화 Lv.${p.ulv}</span><br><span class="cost">${p.ulv < 10 ? ulvCost(p.ulv) + 'G' : 'MAX'}</span>`;
  }
  if (tab === 'r' && S.reson && !p.race2 && !$('items').querySelector('[data-k=r]')) renderItems();
}
$('items').onclick = e => {
  const b = e.target.closest('.it'); if (!b || S.view !== 0) { if (b && S.view !== 0) toast('내 판으로 돌아와서 눌러 주세요'); return }
  const k = b.dataset.k, id = b.dataset.id;
  if (k === 't') { tool = tool === id ? null : id; sel = null; renderItems(); drawNow() }
  else if (k === 'u') { const m = actSend(0, id); if (m) toast(m); else { renderHud(); refreshItems() } }
  else if (k === 'g') { const m = actTech(0); if (m) toast(m); else { toast('⬆ 군단 강화!'); refreshItems() } }
  else if (k === 'r') openReson();
};

/* 판 누르기 */
cv.addEventListener('pointerdown', e => {
  if (!S || S.view !== 0 || modalOpen()) return;
  const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * COLS), y = Math.floor((e.clientY - r.top) / r.height * ROWS);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  const p = me(), t = p.grid[y][x];
  if (t) { sel = { x, y }; tool = null; showTowerInfo(t); renderTabs(); drawNow(); return }
  if (tool) { const m = actBuild(0, x, y, tool); if (m) toast(m); else { sel = { x, y }; if (p.gold < T[tool].c) tool = null; renderItems() } drawNow(); return }
  sel = null; $('info').innerHTML = ''; drawNow();
});
function showTowerInfo(t) {
  const d = t.def, up = d.d && t.lv < 3 ? Math.ceil(d.c * .6 * t.lv) : 0;
  $('info').innerHTML = `<b>${d.n}</b> Lv.${t.lv} — ${descT(d)}<div class="row" style="margin:6px 0 0">${up ? `<button id="bUp">⬆ 강화 ${up}G</button>` : ''}<button id="bSell">💰 판매 +${Math.floor(t.spent * .7)}G</button></div>`;
  if ($('bUp')) $('bUp').onclick = () => { const m = actUpgrade(0, t.x, t.y); toast(m || '⬆ 강화!'); const q = me().grid[t.y][t.x]; if (q) showTowerInfo(q); renderHud() };
  $('bSell').onclick = () => { actSell(0, t.x, t.y); sel = null; $('info').innerHTML = ''; renderAll() };
}

/* 컨트롤 */
$('bPause').onclick = () => { paused = !paused; $('bPause').textContent = paused ? '▶' : '⏸' };
$('bSpd').onclick = () => { spd = spd === 1 ? 2 : spd === 2 ? 4 : 1; $('bSpd').textContent = spd + 'x' };
$('bQuit').onclick = () => openModal(`<h2>그만할까요?</h2><div class="btns"><button onclick="closeModal()">계속하기</button><button class="go" onclick="closeModal();S.over=true;S.shown=true;show('title')">제목으로</button></div>`);

/* 팝업 */
const modalOpen = () => !$('modal').classList.contains('hide');
function openModal(h) { $('mBody').innerHTML = h; $('modal').classList.remove('hide') }
function closeModal() { $('modal').classList.add('hide') }
function openReson() {
  const p = me(); if (p.race2) return;
  const opts = RK.filter(k => RACES[k].play && k !== p.race);
  openModal(`<h2>🔗 공명이 일어났어요!</h2><p>균열의 공명석이 빛납니다. 함께할 <b>두 번째 종족</b>을 고르면 <b>${RACES[p.race].ic}${RACES[p.race].n} + 선택한 종족</b>의 조합 타워·유닛이 열려요. (두 종족의 전용 타워·유닛도 모두 쓸 수 있어요)</p>
    <div class="pick">${opts.map(k => `<button data-k="${k}"><b style="color:${RACES[k].col}">${RACES[k].ic} ${RACES[k].n}</b><small>${RACES[k].tag}</small><small>${[...Object.values(T), ...Object.values(U)].filter(d => d.r.length === 2 && d.r.includes(k) && d.r.includes(p.race)).map(d => d.n).join(', ')}</small></button>`).join('')}</div>`);
  $('mBody').querySelector('.pick').onclick = e => {
    const b = e.target.closest('button'); if (!b) return; p.race2 = b.dataset.k; closeModal(); toast(`🔗 공명! ${comboName(p.race, p.race2)}`); renderAll();
  };
}
function openEnd() {
  const p = me(), w = S.pl[S.winner], won = S.winner === 0;
  openModal(`<h2>${won ? '🏆 우승! 고리를 지켰어요' : `💥 탈락 (${p.rank}등)`}</h2><p>${won ? '마지막까지 살아남았습니다.' : `${w ? w.name + ' ' + RACES[w.race].ic + RACES[w.race].n + '이(가) 고리를 차지했어요.' : ''}`}</p>
    <div class="card small">⏱ ${Math.floor(S.t / 60)}분 ${Math.floor(S.t % 60)}초 · 🐾 보낸 유닛 ${p.sent} · 💀 처치 ${p.kills} · 💥 준 피해 ${fmt(p.dealt)}</div>
    <div class="btns"><button class="go" onclick="closeModal();startGame()">다시 하기</button><button onclick="closeModal();show('title')">제목으로</button></div>`);
}
renderTitle();
