/* 육각 타일(뾰족한 위쪽, 홀수 줄이 오른쪽으로 반 칸 밀린 'odd-r' 배치).
   칸 번호 id = 줄 × 너비 + 칸. 월드 좌표에서 이웃 중심 사이 거리 = √3 */
'use strict';
const SQ3 = Math.sqrt(3);
const HEX = {
  W: 0, H: 0, N: 0, nbs: [],
  setup(w, h) {
    this.W = w; this.H = h; this.N = w * h; this.nbs = [];
    for (let id = 0; id < this.N; id++) {
      const c = id % w, r = (id / w) | 0, odd = r & 1;
      const d = odd ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
      this.nbs.push(d.map(([dc, dr]) => [c + dc, r + dr]).filter(([cc, rr]) => cc >= 0 && rr >= 0 && cc < w && rr < h).map(([cc, rr]) => rr * w + cc));
    }
  },
  col: id => id % HEX.W, row: id => (id / HEX.W) | 0,
  world(id) { const c = id % this.W, r = (id / this.W) | 0; return { x: SQ3 * (c + .5 * (r & 1)) + SQ3 / 2, y: 1.5 * r + 1 } },
  cube(id) { const c = id % this.W, r = (id / this.W) | 0, x = c - (r - (r & 1)) / 2; return [x, -x - r, r] },
  dist(a, b) { const A = this.cube(a), B = this.cube(b); return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])) },
  /* 월드 좌표 → 가장 가까운 칸 (화면 터치용) */
  pick(x, y) { let best = -1, bd = 1e9; for (let id = 0; id < this.N; id++) { const p = this.world(id), d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = id } } return bd < 1.1 ? best : -1 },
  /* 너비 우선 탐색: start에서 goal(id)이 참인 칸까지 가는 첫 걸음과 길 */
  path(start, pass, goal, maxLen = 60) {
    if (goal(start)) return [start];
    const prev = new Int32Array(this.N).fill(-1), q = [start]; prev[start] = start;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (const n of this.nbs[c]) {
        if (prev[n] >= 0) continue;
        if (goal(n)) { prev[n] = c; const out = [n]; let k = c; while (k !== start) { out.push(k); k = prev[k] } out.push(start); return out.reverse() }
        if (!pass(n)) continue;
        prev[n] = c; q.push(n);
        if (q.length > this.N * 2) break;
      }
    }
    return null;
  },
  /* 가중치 거리장(다익스트라): 목표 칸들에서 거꾸로. cost(id)=Infinity면 못 지나감 */
  field(targets, cost) {
    const d = new Float64Array(this.N).fill(Infinity), open = [];
    for (const t of targets) { d[t] = 0; open.push(t) }
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (d[open[i]] < d[open[bi]]) bi = i;
      const c = open.splice(bi, 1)[0];
      for (const n of this.nbs[c]) { const w = cost(n); if (w === Infinity) continue; const nd = d[c] + w; if (nd < d[n]) { d[n] = nd; open.push(n) } }
    }
    return d;
  }
};
