/* 공용 도구 */
'use strict';
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.floor(n).toLocaleString('ko-KR');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canPay = (have, cost) => !cost || ((cost.A || 0) <= have.A && (cost.B || 0) <= have.B);
const pay = (have, cost) => { have.A -= cost.A || 0; have.B -= cost.B || 0 };
const costTxt = c => [c.A ? `${RES.A.ic}${c.A}` : '', c.B ? `${RES.B.ic}${c.B}` : ''].filter(Boolean).join(' ') || '무료';
/* 한국어 조사: jo('넥서스','이','가') */
function jo(w, a, b) { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return w + b; return w + ((c - 0xac00) % 28 ? a : b) }
