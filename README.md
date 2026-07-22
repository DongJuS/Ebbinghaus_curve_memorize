# Ebbinghaus Curve Memorize

RemNote · Anki · MarginNote4를 벤치마킹한 **로컬 플래시카드 학습 앱**.
망각곡선(Ebbinghaus forgetting curve) 알고리즘으로 **소수점 단위 복습 일정**을 계산해
"언제 무엇을 복습할지" 알려주고, 노트를 넣으면 AI가 난이도별 퀴즈를 자동 생성합니다.

모든 데이터는 로컬 SQLite(`data/app.db`)에 저장되며, 브라우저에서 `localhost`로 동작합니다.

## 핵심 기능 (로드맵)

- [x] 코어 인프라 (Next.js + SQLite + 공통 레이아웃)
- [x] 덱 / 플래시카드 CRUD
- [x] 망각곡선 복습 스케줄링 (SM-2 + 소수점 학습단계) + 학습 세션
- [x] 캘린더 기반 학습 이력
- [x] 트리형 마인드맵
- [x] AI 자동 문제 생성 (쉬움 / 보통 / 어려움)
- [x] 기출 기반 유사 문제 생성

## 기술 스택

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — 로컬 DB
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — AI 문제 생성
- [@xyflow/react](https://reactflow.dev/) — 마인드맵

## 복습 알고리즘

SM-2(Anki 방식)를 기반으로, 초기에는 소수점 단위 학습단계로 짧게 반복한 뒤
개인별 이지팩터(EF)에 따라 간격을 늘려갑니다.

```
10분 → 1시간 → 8시간 → 1일 → 3일 → 7일 → ...  (EF로 속도 조절)
```

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속. 데이터베이스는 최초 실행 시 `data/app.db`에 자동 생성됩니다.

### 기타 명령

```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
npm test        # 단위 테스트 (복습 알고리즘 등)
```

## 프로젝트 구조

```
app/            # 라우트 (페이지 + API route handler)
components/     # 공용 UI 컴포넌트
lib/            # DB 레이어, 복습 알고리즘, AI 클라이언트
data/           # 로컬 SQLite 파일 (gitignore)
```
