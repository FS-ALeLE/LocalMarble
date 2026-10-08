# LocalMarble

지역 행사에서 초등학생이 주사위를 굴려 지도를 돌며, 그 지역에 관한 퀴즈와 미니게임으로 지역을 배우는 웹 보드게임입니다.

- 첫 지역: 충청남도 홍성군 — 「홍성 탐험 고고!」
- 첫 행사: 2026년 10월 17일(토)
- 1인 플레이, 태블릿·노트북 웹 브라우저, 미니어처 디오라마 그래픽
- 매 판 소속·별명 등록 → 행사 리더보드 (Vercel + Neon), 기록은 다음 날 삭제

## 주소

- 게임: https://cne-localmarble.vercel.app/
- 전광판: https://cne-localmarble.vercel.app/board
- 진행자: https://cne-localmarble.vercel.app/admin

## 문서
- [기획서](docs/PLAN.md)
- [그래픽 · 사진 준비 가이드](docs/ART_GUIDE.md)

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 배포용 빌드 (dist/)
```

리더보드 서버(`/api`)가 없으면 자동으로 **연습 모드**(기록 없음)로 동작합니다.

## 문항 검수

1. `content/hongseong/questions.csv` 를 구글 시트에서 엽니다 (파일 → 가져오기 → 업로드).
2. 문제·보기·정답·해설을 확인하고 고칩니다. `review_note` 열에 확인이 필요한 부분을 적어 두었습니다.
   - `answer`: 객관식은 정답 보기 번호(1~4), O/X는 `O` 또는 `X`. 게임에서는 보기 순서가 매번 섞입니다.
   - `level`: `low`(저학년) / `high`(고학년) / `both`(공통)
   - 확인을 마친 문항은 `source`에 출처를 쓰고 `verified`를 `TRUE`로 바꿉니다.
3. CSV로 내려받아 같은 경로에 덮어쓰면 `npm run dev` / `npm run build` 때 `public/regions/hongseong/questions.json` 으로 변환됩니다.

지금은 초안 단계라 검수 전 문항도 출제됩니다(화면에 `검수 전` 표시). 행사 전에 `src/config.ts` 의 `allowUnverified` 를 `false` 로 바꿉니다.

## 그림 · 사진 넣기

- AI 생성 그림: `public/regions/hongseong/art/` — 파일 이름은 [그래픽 가이드](docs/ART_GUIDE.md) 3장 표를 따르되, 투명 배경을 잘라내고 가로 640px WebP(`.webp`)로 변환해 넣습니다.
- 사진: `public/regions/hongseong/photos/` — 사진 문항(`P01`~`P10`)은 사진 파일이 있어야 출제됩니다.
- 파일이 없으면 이모지 임시 그림이 대신 보입니다. 파일을 넣기만 하면 자동으로 바뀝니다.

## 구조

```
src/core/        턴·주사위·문항 덱 (지역 무관)
src/scenes/      타이틀, 등록, 준비, 보드, 퀴즈, 결과
src/minigames/   대하 잡기, 같은 그림 찾기
src/services/    API, 금칙어 필터
src/ui/          무대 크기 맞춤, 임시 지도, 도장, 공통 UI
public/regions/hongseong/   보드·문항·상식·별명 데이터, 그림, 사진
content/hongseong/          문항 원본(CSV)
tools/                      CSV → JSON 변환
```

## 배포 (Vercel + Neon)

1. Vercel 프로젝트에 이 저장소를 연결하고, Storage에서 Neon을 추가합니다 → `DATABASE_URL` 자동 등록.
2. Vercel → Settings → Environment Variables 에 두 개를 추가합니다.
   - `ADMIN_PASSWORD`: 진행자 화면 비밀번호
   - `CRON_SECRET`: 아무 긴 임의 문자열 (자동 삭제 호출 확인용)
3. 다시 배포한 뒤 `https://<주소>/admin` 에서 행사를 만듭니다 (시작·끝은 한국 시간).
4. 주소
   - 게임: `/` — 행사 시간에만 순위표에 기록, 그 외에는 연습 모드
   - 전광판: `/board` — 5초마다 갱신, 두 번 누르면 전체 화면
   - 진행자: `/admin` — 행사 만들기, 별명 숨기기, 순위 CSV, 기록 바로 지우기
5. 기록 삭제: 매일 새벽 3시(KST) Vercel Cron이 "끝나는 날 다음 날 0시"가 지난 행사의 기록을 지웁니다. 문항별 정답률만 남습니다.

DB 테이블은 첫 요청 때 자동으로 만들어집니다. 서버 함수는 Neon과 같은 싱가포르(`sin1`)에서 실행됩니다.

### 로컬 시험

```bash
npm run test:api                              # API를 PGlite(로컬 PostgreSQL)로 시험
npm run build && npx tsx tests/local-server.ts  # dist + API를 http://localhost:4300 에서 실행 (진행자 비밀번호: admin)
```
