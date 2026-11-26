/* 화면 없이 AI끼리 N판 돌려서 판 길이·우승 종족을 봄: node tools/sim.js [판수] */
const fs = require('fs'), vm = require('vm');
const code = ['js/data.js', 'js/engine.js'].map(f => fs.readFileSync(__dirname + '/../' + f, 'utf8')).join('\n') +
  '\n;this.api={newGame,step,get S(){return S},RACES,RK};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
const { newGame, step, RK } = ctx.api, N = +process.argv[2] || 40;
const win = {}, sec = []; let stuck = 0;
for (let g = 0; g < N; g++) {
  newGame({ sim: true, allAI: true });
  let guard = 0;
  while (!ctx.api.S.over && ctx.api.S.t < 3000) { step(.1); guard++ }
  const S = ctx.api.S;
  if (!S.over) { stuck++; continue }
  const w = S.pl[S.winner]; win[w.race] = (win[w.race] || 0) + 1; sec.push(S.t);
}
sec.sort((a, b) => a - b);
console.log('판', N, '끝난 판', sec.length, '안 끝남', stuck);
if (sec.length) console.log('길이(분) 최소', (sec[0] / 60).toFixed(1), '중간', (sec[sec.length >> 1] / 60).toFixed(1), '최대', (sec[sec.length - 1] / 60).toFixed(1));
console.log('종족별 우승', JSON.stringify(win));
