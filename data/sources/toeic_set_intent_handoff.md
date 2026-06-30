# During-the-commute 토익 단어 데이터 — Set별 제작 의도 (인계용)

> 앱 개발 전용 챗 인계 문서. 각 Set이 "무엇 위주로" 구성됐는지 정리.
> 누적: Level 1 = 140개, Level 2 = 488개 (Set 1~8), **합계 628개**. Level 3는 진행 예정.

---

## 공통 구조·규칙
- **JSON 스키마**: `{ id, concept, ko, topic, words:[{ cat, pos, word, mean, ex, exKo }] }`
- **cat**: `단어` / `연결` / `표현` · **pos**: `v` / `n` / `adj` / `adv` / `prep` / `phrase` (prep는 v2에서 추가)
- **그룹화**: 어근 가족(동사-명사-형용사-부사) 묶음이 기본
- **mean**: 순수 한글 뜻만 (품사 주석 "(동사)" 등 금지 — 품사는 pos, 구분은 예문이 담당)
- **자가검증**: 매 Set마다 사실성/중복(배치 내 + 기존 전체 교차)/형식 점검
- **레벨**: Level 1 = 기초~600점 · Level 2 = 700점대 · Level 3 = 800점+

---

## Level 1 (기초~600점) — 140개, 55그룹
- **Set 1** (그룹 1~27, ≈70개) : 기초 빈출 어근 가족 전반부. **사무/업무·회의/일정·계약/거래·인사/채용·일정/예약** 중심. 일상·비즈니스 핵심 동사(manage, employ, apply, attend, reserve 등). 거의 전부 `단어`.
- **Set 2** (그룹 28~55, ≈70개) : 기초 빈출 어근 가족 후반부. **배송/주문·광고/마케팅·공지/안내·시설/유지보수·재무/결제·고객/서비스** 중심(deliver, advertise, inform, maintain, pay, satisfy 등).

## Level 2 (700점대) — 488개, Set 1~8
- **Set 1** (90개) : 700점대 진입. Level 1에서 보류한 4개(applicable·negotiable·satisfactory·attendant)로 시작. **법률/규정·재무/회계·제조/물류** 등 전문 주제 + 결의 단어(comply·eligible·allocate·prioritize) + **첫 혼동 쌍**(affect/effect, economic/economical, assure/ensure/insure) + 콜로케이션 보강.
- **Set 2** (66개) : 전문 가족 확장(재무·인사평가·법률·마케팅·제조) + 혼동 쌍(complement/compliment, principal/principle, raise/rise, considerable/considerate, respectful/respective). **mean 순수화 기준** 적용 시작.
- **Set 3** (63개) : 전문 가족 확장(account·transfer·reliability·flexibility·innovation·comprehension 등) + 혼동 쌍(lie/lay, advice/advise, lose/loose, personnel/personal, stationary/stationery, formerly/formally) + **연결어**(nevertheless·furthermore·consequently·despite).
- **Set 4** (59개) : Set 3와 무중복 전문 가족(deposit·delegation·nomination·accountability·breach·validity·outsourcing 등) + 혼동 쌍(precede/proceed, adapt/adopt, device/devise).
- **Set 5** (54개) : 인사평가·재무·법률·제조 추가 가족(appraisal·remittance·stipulation·automation·calibration 등). **prep 정식 도입** 후 prep 활용 혼동 쌍(beside/besides, later/latter, thorough/through).
- **Set 6** (52개) : **콜로케이션 대폭 강화**(표현 12개) + **다의어 그룹 첫 도입**(address·issue·yield·figure·draft) + 혼동 쌍(accept/except, cite/site/sight, quiet/quite).
- **Set 7** (53개) : 다의어 7개(term·interest·balance·credit·cover·post·prompt) + 혼동 쌍(lend/borrow, imply/infer, industrial/industrious, sensible/sensitive, continual/continuous) + 남은 전문어(verify·certify·coordinate·reconcile·mediate).
- **Set 8** (51개) : **Level 2 마무리.** 다의어 8개(claim·fine·appreciate·settle·process·release·feature·draw) + 혼동 쌍(moral/morale, eminent/imminent, wary/weary) + 콜로케이션 + 통근 어휘(commute).

> Level 2 후반(Set 5~8)은 새 어근 가족 풀이 얇아져 **다의어·콜로케이션·혼동 쌍** 비중을 키움 — 700점대 변별 포인트라 학습 가치 충분.

## Level 3 (800점+) — 진행 예정
방향: 같은 어근의 **미묘한 의미차 파생어**(considerate류) · **형태 유사 함정어**(discreet/discrete류) · **다의어 심화** · **격식체/공문·법률 어휘** · 더 길고 복잡한 예문(독해력 동반 평가).

---

## 파일 목록
| 파일 | 레벨/Set | 항목 |
|---|---|---|
| toeic_level1_batch1.json | Level 1 (Set 1+2 통합) | 140 |
| toeic_level2_set1.json ~ set8.json | Level 2 Set 1~8 | 90·66·63·59·54·52·53·51 |
| toeic_data_rules_v1.md | 제작·자가검증 규칙 (v2: prep 추가) | — |

*Level 1 파일은 한 파일에 Set 1+2가 합쳐져 있음. 필요 시 set1/set2 두 파일로 분리 가능.*
