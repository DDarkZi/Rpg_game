/* 저장(localStorage). 기기 브라우저에만 저장돼요 */
'use strict';
const SAVE_KEY = 'resonance_war_save_v1';
function blankSave() {
  return { v: 1, clear: { N: {}, H: {}, X: {} }, best: {}, hybrids: [], meta: { startA: 0, mine: 0, nexusHp: 0 }, pts: 0, lore: [], seen: {}, set: { spd: 1, dmg: true }, diff: 'N', hyb: null };
}
let SV = blankSave();
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) { const b = blankSave(); SV = Object.assign(b, s); SV.meta = Object.assign(b.meta, s.meta); SV.set = Object.assign(b.set, s.set); SV.clear = Object.assign(b.clear, s.clear) } } catch (e) { /* 저장 막힘 */ }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SV)) } catch (e) { /* 무시 */ } }
const clearedAny = sid => ['N', 'H', 'X'].some(d => SV.clear[d][sid]);
function stageOpen(sid) { const r = REGIONS.find(r => r.stages.includes(sid)), i = r.stages.indexOf(sid); return i === 0 || clearedAny(r.stages[i - 1]) }
const metaSpent = () => Object.values(SV.meta).reduce((a, b) => a + b, 0);
const ptsFree = () => SV.pts - metaSpent();
/* 클리어 기록 + 첫 클리어 보상(포인트·해금). 돌려줌: 새로 얻은 것 목록 */
function recordClear(sid, diff, sec) {
  const got = [], st = STAGES[sid];
  if (!SV.clear[diff][sid]) { SV.clear[diff][sid] = 1; SV.pts += DIFFS[diff].pts; got.push(`⭐ 영구 성장 포인트 +${DIFFS[diff].pts}`) }
  const u = st.unlock || {};
  for (const h of u.hybrid || []) if (!SV.hybrids.includes(h)) { SV.hybrids.push(h); got.push(`🔗 혼성 종족 해금: ${HYBRIDS[h].ic} ${HYBRIDS[h].n}`) }
  for (const l of u.lore || []) if (!SV.lore.includes(l)) { SV.lore.push(l); got.push(`📖 이야기 공개: ${LORE[l].n}`) }
  const k = sid + diff; if (!SV.best[k] || sec < SV.best[k]) SV.best[k] = Math.round(sec);
  writeSave(); return got;
}
