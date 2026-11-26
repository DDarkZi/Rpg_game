# 공명 전쟁 — Claude 작업 수첩

> 저장소 `rpg_game` = **공명 전쟁** 전용(사이트 `https://ddarkzi.github.io/Rpg_game/`). **짹짹이(jjak-relay-defense)와 완전히 다른 앱** — 짹짹이 저장소는 건드리지 않아요.
> 저장소 이름은 사용자가 나중에 `resonance-war`로 바꿀 수 있어요.

## 프로젝트
- **공명 전쟁**: 8종족(인간·마법·기계·곤충·외계·동물·엘프·언데드) 2D 도트 타워 디펜스 대전. 규칙은 짹짹이와 같음(8명 원형, 유닛을 다음 사람 판으로 보냄, 타워로 막음). 종족 2개를 합치면 조합 타워·유닛.
- 기획·조합표·스토리는 `docs/design.md`. 워크래프트/스타크래프트의 이름·캐릭터·그림은 쓰지 않음(구조만 참고).
- 순수 HTML/CSS/JS + Canvas 2D(작은 캔버스 7x10칸×16px을 CSS로 확대, `image-rendering: pixelated`). 빌드 도구 없음.

- 🧰 `.claude/skills/`에 외부 오픈소스 게임 개발 스킬 16개(awesome-gamedev-agent-skills, Apache-2.0, 목록·출처는 `.claude/skills/README.md`). **스킬 안내와 이 수첩 규칙이 다르면 이 수첩이 먼저**(빌드 도구 없는 순수 HTML/JS). 스킬 파일은 고치지 말고 그대로 두기.

## 사용자와 일하는 방식
- 답은 항상 **한국어, 초보자 눈높이**. 사용자는 주로 휴대폰으로 확인. 폰으로 못 본 것(손맛·밸런스·그림 느낌)은 솔직히 말하기.
- 변경을 끝내면 `index.html` `#updates` 맨 위에 `<li><b>vX.Y</b> …</li>` + 커밋 후 push(`main`). 커밋 메시지에 모델 이름 넣지 않기. 개인정보(이메일 등) 넣지 않기.

## 파일
- `js/data.js` 종족 `RACES`·타워 `T`·유닛 `U`(표 한 줄 = 하나). 조합은 `r:[종족A,종족B]`(순서는 `RK` 순서).
- `js/engine.js` 규칙(화면 코드 없음 → 노드에서 시뮬 가능): `newGame`, `step`, `actBuild/actUpgrade/actSell/actSend/actTech`, AI(`aiTick`).
- `js/sprites.js` 8x8 도트 `SHAPES`(글자 그림, 종족 색으로 자동 칠함. 조합=주색A+포인트색B) · `js/render.js` 판 그리기 · `js/ui.js` 화면 조작.
- `tools/sim.js` AI끼리 N판 돌려 판 길이·종족별 우승 확인: `node tools/sim.js 30`

## 규칙 메모
- 지상=칸 길찾기(`cellDist`, 타워 칸 막힘, 출발 칸이 막히면 건설 거부). 공중=직선. 공중/지상 구분: 그림자·띄우기·타워 대상(`t:'G'|'A'|'GA'`).
- 새 효과를 넣을 땐 `towerTick`/`unitsTick`에 추가하고 `ui.js`의 `descT`/`descU` 설명도 같이.
- 시간 지나면 유닛 체력↑(`hpMul`)·탈출 피해↑(`lateMul`) 장치가 없으면 판이 안 끝남(AI가 골드를 쌓음) — 지우지 말 것.
- 한 줄 코드 중간에 `//` 주석 금지 → `/* */`.

## 테스트
- `python3 -m http.server 8125`(저장소 맨 바깥에서) → Playwright로 화면 확인. 서비스워커 없음.
- 밸런스는 표본 오차가 큼(30판에도 ±). 한 번 결과로 판단하지 말 것.

## 남은 일
- 마법·외계·동물·엘프·언데드 구현 · 조합 28개 · 밸런스(시제품: 인간 우세) · 스토리 연출 · 효과음 · 온라인.
