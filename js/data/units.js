/* 유닛 데이터. role: tank·melee·ranged·support·siege · as 초당 공격 · range 칸 · speed 칸/초
   air: 공중 공격 가능 · req: {tech} 또는 {hybrid} · target: 타겟 우선순위 */
'use strict';
const UNITS = {
  shield: { n: '방패병', race: 'iron', role: 'tank', ic: '🛡', hp: 420, atk: 14, as: 1, range: 1, armor: 4, armorType: 'heavy', atkType: 'normal', speed: 1, cost: { A: 60 }, time: 6, target: 'nearest', d: '앞줄에서 버티는 탱커' },
  sword: { n: '검사', race: 'iron', role: 'melee', ic: '⚔️', hp: 260, atk: 28, as: 1.1, range: 1, armor: 1, armorType: 'light', atkType: 'normal', speed: 1.3, cost: { A: 75 }, time: 7, target: 'nearest', d: '중앙의 근접 딜러' },
  rifle: { n: '소총병', race: 'iron', role: 'ranged', ic: '🏹', hp: 170, atk: 22, as: 1, range: 3, armor: 0, armorType: 'light', atkType: 'pierce', air: true, speed: 1.1, cost: { A: 80 }, time: 7, target: 'nearest', d: '후방 원거리. 공중도 쏴요' },
  medic: { n: '의무병', race: 'iron', role: 'support', ic: '✚', hp: 160, heal: 18, as: .8, range: 2, armor: 0, armorType: 'light', atkType: 'none', speed: 1.2, cost: { A: 70, B: 20 }, time: 8, target: 'lowestAlly', d: '다친 아군을 치료해요' },
  cannon: { n: '증기 포병', race: 'iron', role: 'siege', ic: '💣', hp: 200, atk: 45, as: .5, range: 4, splash: 1, armor: 1, armorType: 'light', atkType: 'siege', speed: .8, cost: { A: 120, B: 60 }, time: 10, req: { tech: 'steam' }, target: 'nearest', d: '광역 포격(주변 1칸 60%). 공중은 못 쏴요' },
  golem: { n: '반석 골렘', race: 'bansuk', role: 'tank', ic: '🗿', hp: 900, atk: 20, as: .8, range: 1, armor: 7, armorType: 'heavy', atkType: 'normal', speed: .7, cost: { A: 150, B: 80 }, time: 12, req: { hybrid: 'bansuk' }, taunt: 2, target: 'nearest', d: '혼성 유닛. 주변 2칸 적의 공격을 끌어당겨요' }
};
