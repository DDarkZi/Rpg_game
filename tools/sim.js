/* 화면 없이 스테이지를 돌려 보는 시험기: node tools/sim.js [판수] [난이도 N|H|X]
   - 'bot'  : 사람처럼 짓고 뽑고 배치하는 간단한 봇
   - 'idle' : 아무것도 안 함(반드시 져야 정상) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = path.join(__dirname, '..', 'js');
const files = ['core/util.js', 'grid/hex.js', 'data/core.js', 'data/races.js', 'data/units.js', 'data/buildings.js', 'data/enemies.js', 'data/tech.js', 'data/stages.js',
  'game/state.js', 'game/economy.js', 'game/build.js', 'game/combat.js', 'game/bot.js'];
const code = files.map(f => fs.readFileSync(path.join(R, f), 'utf8')).join('\n;\n') + '\n;this.api={newBattle,stepBattle,botTick,actBoon,get B(){return B}};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
const { newBattle, stepBattle, botTick } = ctx.api;
const N = +process.argv[2] || 5, diff = process.argv[3] || 'N';
function run(sid, mode, hybrid) {
  newBattle(sid, diff, { sim: true, hybrid, meta: {} }); let B = ctx.api.B, tb = 0;
  while (!B.result && B.t < 1800) { if (mode === 'bot' && (tb -= .05) <= 0) { botTick(); tb = .5 } if (mode === 'idle' && B.phase === 'reward') ctx.api.actBoon(B.boonChoice[0]); stepBattle(.05) }
  return { r: B.result || 'timeout', t: Math.round(B.t), wave: B.wave + 1, hp: Math.round(B.nexus.hp), units: B.units.length, kills: B.stats.kills, lost: B.stats.lost, lv: B.nexus.lv, tech: Object.keys(B.techDone).length };
}
for (const sid of ['s1', 's2', 's3']) {
  const hyb = sid === 's1' ? null : 'bansuk';
  const res = []; for (let i = 0; i < N; i++) res.push(run(sid, 'bot', hyb));
  const idle = run(sid, 'idle', hyb);
  const w = res.filter(x => x.r === 'win').length;
  console.log(`${sid} [${diff}] 봇 승리 ${w}/${N} · 평균 ${Math.round(res.reduce((a, b) => a + b.t, 0) / N)}초 · 예: ${JSON.stringify(res[0])}`);
  console.log(`   아무것도 안 함: ${JSON.stringify(idle)}`);
}
