# 공명 전쟁 — Claude 작업 수첩

> 저장소 `rpg_game` = **공명 전쟁** 전용(사이트 `https://ddarkzi.github.io/Rpg_game/`). **짹짹이(jjak-relay-defense)와 완전히 다른 앱** — 짹짹이 저장소는 건드리지 않아요. 저장소 이름은 사용자가 나중에 `resonance-war`로 바꿀 수 있어요.

## 프로젝트 (v0.2 대개편, 2026-11-26)
- **스타크래프트식 기지 운영 + 롤토체스식 배치·자동 전투 + 육각 타일 디펜스**, 스토리 중심 1인용 스테이지 진행. 설계·진행 상황은 `docs/design.md`(먼저 읽기).
- 세계관: 에너지원 **아르카**를 둘러싼 8종족(철성 연합·숲결 엘프·성휘 마도회·잿그림자 망령단·거수 부족·천공 날개족·화강 결정족·변이 군체) + 혼성 28. 지금 플레이 가능: 철성 연합 + 혼성 「반석 기사단」. 나머지는 데이터만 있고 화면에 '준비 중'.
- 재화는 **정확히 2종**: 🔷 루멘(기본) · 🟣 정수(고급). 영구 성장은 '포인트'(재화 아님).
- 옛 8인 원형 대전 시제품은 `legacy/ring-war/`에 보관(지우지 말 것, 따로 열림).
- 순수 HTML/CSS/JS + Canvas 2D, 빌드 도구 없음. 다른 게임(스타·워크·롤토체스·짹짹이)의 이름·캐릭터·그림·코드는 쓰지 않음(구조만 참고).
- 🧰 `.claude/skills/`에 외부 오픈소스 게임 개발 스킬 16개(awesome-gamedev-agent-skills, Apache-2.0, `.claude/skills/README.md`). **스킬 안내와 이 수첩이 다르면 이 수첩이 먼저**. 스킬 파일은 고치지 않기.

## 사용자와 일하는 방식
- 답은 항상 **한국어, 초보자 눈높이**. 사용자는 주로 휴대폰으로 확인. 폰으로 못 본 것(손맛·밸런스·그림 느낌)은 솔직히 말하기. **완성되지 않은 기능을 완성된 것처럼 말하거나 표시하지 않기**.
- 변경을 끝내면 `index.html` `#updates` 맨 위에 `<li><b>vX.Y</b> …</li>` + `docs/design.md` 상태 갱신 + 커밋 후 push(`main`). 커밋 메시지에 모델 이름 넣지 않기. 개인정보 넣지 않기.

## 파일 구조 (데이터 기반 — 새 종족·유닛은 데이터만 추가)
- `js/data/` core.js(RES·TILES·DMG_MULT·DIFFS·WORKER) · races.js(RACES 8·HYBRID_LIST 28) · units.js · buildings.js(BUILDINGS·NEXUS) · enemies.js · tech.js(TECH·SYNERGIES·BOONS·META) · stages.js(REGIONS·STAGES·LORE)
- `js/grid/hex.js` 육각(odd-r): `HEX.nbs`·`dist`·`world`·`path`(BFS)·`field`(다익스트라)
- `js/game/` state.js(`newBattle`·`B`·`refreshStats`·`flowRecalc`·`pathCells`) · economy.js(일꾼) · build.js(건설·생산·배치·연구·넥서스·궁극기) · combat.js(적/유닛 AI·피해·웨이브·`stepBattle`) · bot.js(시험 봇, 페이지에는 안 넣음)
- `js/render/render.js` 그리기(임시 도형+이모지, `drawEntity` 한 곳만 바꾸면 스프라이트로 교체) · `js/ui/` screens.js(메뉴·지도·세계관·종족·성장·설정·대화) · battle_ui.js(HUD·탭·터치·루프)
- `js/core/` util.js · save.js(localStorage `resonance_war_save_v1`)
- 행동 함수 `act…()`는 실패 이유 글을 돌려주고 성공이면 `''`. 화면 코드는 `game/`에 넣지 않기(노드 시뮬이 깨짐).

## 규칙 메모
- 적 이동: 넥서스까지 가중 거리장(`flowRecalc`, 건물 칸은 비용 12 → 막으면 부수고 감). 유닛은 집 칸에서 `LEASH`(3) 안만 쫓음. 공중 적은 월드 좌표 직선 이동.
- 능력치는 `refreshStats()` 한 곳(기술 `fx0`·시너지·타일 보너스·보상 카드 `mods`). 배치·연구·보상 뒤 꼭 호출.
- 한 줄 코드 중간에 `//` 주석 금지 → `/* */`. 조사 `jo(단어,'을','를')`.

## 테스트
- 시뮬: `node tools/sim.js 8 N`(N·H·X) — 봇 승률·아무것도 안 할 때 패배 확인. 표본 오차 큼.
- 화면: `python3 -m http.server 8127` → Playwright(`hasTouch`, 터치 좌표는 `toScr(HEX.world(id))`).
