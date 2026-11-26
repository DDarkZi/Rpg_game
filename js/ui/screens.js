/* 화면: 시작 메뉴 · 세계 지도(스테이지 선택) · 세계관 · 종족 · 영구 성장 · 설정 · 팝업 */
'use strict';
const $ = id => document.getElementById(id);
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.add('hide'); $(id).classList.remove('hide'); const f = SCREENS[id]; if (f) f() }
const modalOpen = () => !$('modal').classList.contains('hide');
let modalLock = false;
function openModal(h, lock) { $('mBody').onclick = null; $('mBody').innerHTML = h; $('modal').classList.remove('hide'); modalLock = !!lock }
function closeModal() { $('modal').classList.add('hide'); $('mBody').onclick = null; modalLock = false }
$('modal').addEventListener('click', e => { if (e.target.id === 'modal' && !modalLock) closeModal() });
/* 대화 연출: lines = [{w, t}] */
function dialog(lines, done) {
  let i = 0;
  const next = () => {
    if (i >= lines.length) { closeModal(); if (done) done(); return }
    const l = lines[i++];
    openModal(`<div class="dlg">${l.w ? `<div class="who">${esc(l.w)}</div>` : ''}<div class="t">${esc(l.t)}</div><div class="nx2">▶ 눌러서 계속 ${i}/${lines.length}</div></div>`, true);
    $('mBody').onclick = next;
  };
  next();
}
for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => show(b.dataset.go);

/* ── 세계 지도 ── */
let selStage = 's1';
function renderMap() {
  if (!stageOpen(selStage)) selStage = 's1';
  $('regions').innerHTML = REGIONS.map(r => `<div class="card region"><h3>${r.ready ? '🗺' : '🔒'} ${r.n}</h3><div class="small">${r.d}${r.ready ? '' : ' — <b>준비 중</b>'}</div>
    ${r.ready ? `<div class="nodes">${r.stages.map((s, i) => { const st = STAGES[s], open = stageOpen(s), stars = ['N', 'H', 'X'].map(d => SV.clear[d][s] ? '★' : '☆').join('');
      return (i ? '<span class="arrow">→</span>' : '') + `<button class="node ${s === selStage ? 'on' : ''} ${st.boss ? 'boss' : ''}" data-s="${s}" ${open ? '' : 'disabled'}>${open ? '' : '🔒 '}${st.boss ? '👑 BOSS' : 'STAGE 0' + (i + 1)}<small>${stars}</small></button>` }).join('')}</div>` : ''}</div>`).join('');
  for (const b of document.querySelectorAll('.node')) b.onclick = () => { selStage = b.dataset.s; renderMap() };
  $('diffs').innerHTML = Object.entries(DIFFS).map(([k, d]) => `<button data-d="${k}" class="${SV.diff === k ? 'on' : ''}">${d.n}<br><small>${d.ko}</small></button>`).join('');
  for (const b of $('diffs').children) b.onclick = () => { SV.diff = b.dataset.d; writeSave(); renderMap() };
  const hy = SV.hybrids.filter(h => HYBRIDS[h].ready);
  if (SV.hyb && !hy.includes(SV.hyb)) SV.hyb = null;
  $('loadout').innerHTML = `<div class="pickrow">${RK.map(k => `<button class="${k === 'iron' ? 'on' : 'off'}" data-r="${k}">${RACES[k].ic} ${RACES[k].n}${RACES[k].play ? '' : '<br><small>준비 중</small>'}</button>`).join('')}</div>
    <div class="lbl" style="margin-top:8px">혼성 종족(공명)</div><div class="pickrow"><button data-h="" class="${!SV.hyb ? 'on' : ''}">없음</button>${hy.map(h => `<button data-h="${h}" class="${SV.hyb === h ? 'on' : ''}">${HYBRIDS[h].ic} ${HYBRIDS[h].n}</button>`).join('')}${hy.length ? '' : '<button disabled>🔒 STAGE 02를 깨면 공명</button>'}</div>`;
  for (const b of $('loadout').querySelectorAll('[data-r]')) b.onclick = () => { if (!RACES[b.dataset.r].play) toastG(`${RACES[b.dataset.r].n}은(는) 아직 준비 중이에요`) };
  for (const b of $('loadout').querySelectorAll('[data-h]')) b.onclick = () => { SV.hyb = b.dataset.h || null; writeSave(); renderMap() };
  const st = STAGES[selStage], cnt = {};
  st.waves.forEach(w => w.g.forEach(g => cnt[g.e] = (cnt[g.e] || 0) + g.n));
  $('stageInfo').innerHTML = `<b>${st.n}</b><br>웨이브 ${st.waves.length}개 · 시작 ${costTxt(st.start)}<br>등장: ${Object.entries(cnt).map(([e, n]) => `${ENEMIES[e].ic}${ENEMIES[e].n}×${n}`).join(' · ')}${SV.best[selStage + SV.diff] ? `<br>최고 기록 ${Math.floor(SV.best[selStage + SV.diff] / 60)}분 ${SV.best[selStage + SV.diff] % 60}초` : ''}`;
}
$('bGo').onclick = () => startStage(selStage);
function toastG(m) { const t = document.createElement('div'); t.textContent = m; t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#000c;padding:8px 14px;border-radius:14px;font-size:13px;z-index:20'; document.body.appendChild(t); setTimeout(() => t.remove(), 1600) }

/* ── 세계관 ── */
function renderStory() {
  let h = '<div class="card lore"><h3>🌌 프롤로그</h3><p>세계 한가운데에서 솟는 거대한 에너지 「아르카」. 여덟 종족은 아르카를 둘러싸고 경쟁한다. 그리고 어느 날, 하늘의 균열에서 군체가 내려왔다.</p></div>';
  for (const [k, l] of Object.entries(LORE)) {
    const st = Object.entries(STAGES).find(([, s]) => (s.unlock.lore || []).includes(k));
    h += SV.lore.includes(k) ? `<div class="card lore"><h3>📖 ${l.n}</h3><p>${l.t}</p></div>` : `<div class="card small">🔒 ??? — ${st ? STAGES[st[0]].n : ''} 클리어 시 공개</div>`;
  }
  $('storyBody').innerHTML = h;
}
/* ── 종족 ── */
let raceView = 'iron';
function raceRevealed(k) { const r = RACES[k]; return !r.reveal || clearedAny(r.reveal) }
function renderRace() {
  const r = RACES[raceView], rev = raceRevealed(raceView), s = r.story;
  let h = `<div class="rgrid">${RK.map(k => `<button data-k="${k}" class="${k === raceView ? 'on' : ''}"><i>${RACES[k].ic}</i>${RACES[k].n}</button>`).join('')}</div>
    <div class="card small"><b style="color:${r.col};font-size:16px">${r.ic} ${r.n}</b> · ${r.arch} ${r.play ? '· <b>플레이 가능</b>' : '· 준비 중'}<br>`;
  h += `강점: <b>${r.strong}</b><br>약점: <b>${r.weak}</b><br>`;
  if (rev) h += `기원: ${r.origin}<br>본거지: ${r.home}<br>사회: ${r.society}<br>지도자: <b>${r.leader}</b><br>전투 철학: ${r.philosophy}<br>경제: ${r.economy}<br>기술: ${r.tech}<br>고유 건물: ${r.buildings.join(', ')}<br>고유 유닛: ${r.units.join(', ')}<br>고유 기술: ${r.uniqueTech}<br><br>
    <b>이야기</b><br>탄생: ${s.birth}<br>대전쟁: ${s.war}<br>목표: ${s.goal}<br>관계: ${s.relations} (적: ${s.enemy} · 동맹: ${s.ally})<br>핵심 인물: ${s.figure}<br>기술의 기원: ${s.techOrigin}<br>넥서스: ${s.nexus}<br>이 종족을 고르는 이유: ${s.why}`;
  else h += `🔒 자세한 이야기는 ${STAGES[r.reveal].n} 클리어 시 공개돼요.`;
  h += `</div><h3 style="font-size:15px">🔗 혼성 종족 28 (공명)</h3><div class="hgrid">${Object.values(HYBRIDS).map(x => { const own = SV.hybrids.includes(x.id);
    return `<button class="${own ? '' : 'lock'}" data-h="${x.id}">${RACES[x.a].ic}${RACES[x.b].ic}<br>${own ? x.ic + ' ' + x.n : '???'}</button>` }).join('')}</div><div id="hdet" class="card small">조합을 눌러 보세요. 아직 공명하지 않은 조합은 ??? 로 보여요.</div>`;
  $('raceBody').innerHTML = h;
  for (const b of $('raceBody').querySelectorAll('[data-k]')) b.onclick = () => { raceView = b.dataset.k; renderRace() };
  for (const b of $('raceBody').querySelectorAll('[data-h]')) b.onclick = () => {
    const x = HYBRIDS[b.dataset.h], own = SV.hybrids.includes(x.id);
    $('hdet').innerHTML = own ? `<b>${x.ic} ${x.n}</b> (${RACES[x.a].n} + ${RACES[x.b].n})<br>탄생: ${x.birth || '-'}<br>지도자: ${x.leader || '-'}<br>문화: ${x.culture || '-'}<br>자원: ${x.res || '-'}<br>건물: ${x.building || '-'} · 유닛: ${x.unit || '-'}<br>패시브: <b>${x.passive}</b><br>궁극기: <b>${x.ult}</b><br>약점: ${x.weak}<br>“${x.story}”`
      : `${RACES[x.a].ic} ${RACES[x.a].n} + ${RACES[x.b].ic} ${RACES[x.b].n} = ???<br>${x.ready ? '스테이지를 진행하면 공명할 수 있어요.' : '이 공명은 아직 준비 중이에요.'}`;
  };
}
/* ── 영구 성장 ── */
function renderUp() {
  let h = `<div class="card small">스테이지를 처음 깰 때 포인트를 받아요(NORMAL 1 · HARD 2 · NIGHTMARE 3). 너무 세지지 않게 항목마다 최대 3단계예요.<br>남은 포인트: <b style="color:var(--gold);font-size:16px">${ptsFree()}</b></div>`;
  for (const [k, m] of Object.entries(META)) h += `<div class="row"><span><b>${m.n}</b> Lv.${SV.meta[k]}/${m.max}<br><small class="small">${m.d}</small></span><button data-m="${k}" ${SV.meta[k] >= m.max || ptsFree() < 1 ? 'disabled' : ''}>+1 (1점)</button></div>`;
  h += `<div class="btns"><button id="mReset">포인트 되돌리기</button></div>`;
  $('upBody').innerHTML = h;
  for (const b of $('upBody').querySelectorAll('[data-m]')) b.onclick = () => { SV.meta[b.dataset.m]++; writeSave(); renderUp() };
  $('mReset').onclick = () => { for (const k in SV.meta) SV.meta[k] = 0; writeSave(); renderUp() };
}
/* ── 설정 ── */
function renderSet() {
  $('setBody').innerHTML = `<div class="row"><span>기본 게임 속도</span><span><button data-sp="1" class="${SV.set.spd === 1 ? 'go' : ''}">1x</button> <button data-sp="2" class="${SV.set.spd === 2 ? 'go' : ''}">2x</button></span></div>
    <div class="row"><span>피해 숫자 표시</span><button id="sDmg">${SV.set.dmg ? '켜짐' : '꺼짐'}</button></div>
    <div class="row"><span>진행 초기화<br><small class="small">클리어·해금·성장이 모두 지워져요</small></span><button id="sReset">초기화</button></div>
    <div class="card small">조작: 탭 = 선택 · 길게 누르기 = 정보 · 드래그 = 지도 이동 · 두 손가락 = 확대/축소</div>`;
  for (const b of $('setBody').querySelectorAll('[data-sp]')) b.onclick = () => { SV.set.spd = +b.dataset.sp; writeSave(); renderSet() };
  $('sDmg').onclick = () => { SV.set.dmg = !SV.set.dmg; writeSave(); renderSet() };
  $('sReset').onclick = () => openModal(`<h2>정말 초기화할까요?</h2><p>되돌릴 수 없어요.</p><div class="btns"><button onclick="closeModal()">취소</button><button class="go" id="sYes">초기화</button></div>`) || ($('sYes').onclick = () => { SV = blankSave(); writeSave(); closeModal(); renderSet() });
}
const SCREENS = { map: renderMap, story: renderStory, race: renderRace, upgrade: renderUp, settings: renderSet };
