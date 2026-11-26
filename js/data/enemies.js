/* 적(변이 군체) 데이터. ai: nexus(넥서스로) · defense(방어시설·유닛 우선) · backline(후방 유닛 암살) · air(지형 무시 비행) · building(건물 우선) */
'use strict';
const ENEMIES = {
  gnaw: { n: '갉쟁이', ic: '🐜', hp: 120, atk: 10, as: 1, range: 1, armor: 0, armorType: 'light', atkType: 'normal', speed: 1.1, ai: 'nexus', bounty: { A: 6 }, d: '넥서스로 달려가며 막는 것은 물어뜯어요' },
  shell: { n: '껍질등', ic: '🪲', hp: 420, atk: 14, as: .8, range: 1, armor: 5, armorType: 'heavy', atkType: 'normal', speed: .7, ai: 'defense', bounty: { A: 12 }, d: '탱커. 방어탑과 유닛을 먼저 노려요' },
  stinger: { n: '그림자침', ic: '🦂', hp: 140, atk: 26, as: 1.2, range: 1, armor: 0, armorType: 'light', atkType: 'normal', speed: 1.8, ai: 'backline', bounty: { A: 12 }, d: '암살자. 후방 원거리·지원 유닛을 노려요' },
  spore: { n: '포자 날개', ic: '🦟', hp: 110, atk: 12, as: 1, range: 1, armor: 0, armorType: 'light', atkType: 'normal', speed: 1.2, air: true, ai: 'air', bounty: { A: 10, B: 2 }, d: '비행. 지형을 무시하고 넥서스로 날아와요(대공 필요)' },
  acid: { n: '산성 포격충', ic: '🐌', hp: 200, atk: 30, as: .5, range: 3, armor: 1, armorType: 'light', atkType: 'siege', speed: .8, ai: 'building', bounty: { A: 14, B: 3 }, d: '공성. 건물을 멀리서 녹여요' },
  brood: { n: '군체 모후', ic: '👑', boss: true, hp: 4200, atk: 45, as: .6, range: 2, armor: 4, armorType: 'heavy', atkType: 'normal', speed: .45, ai: 'nexus', bounty: { A: 300, B: 100 },
    skills: [{ k: 'summon', every: 12, e: 'gnaw', n: 3 }, { k: 'acid', every: 9, radius: 1, dmg: 70, range: 5 }],
    phase2: { at: .5, speedMul: 1.5, armorAdd: 2, summon: 'spore' }, d: '보스. 새끼를 부르고 산성을 뿌려요. 체력 절반이 되면 광폭해져요' }
};
