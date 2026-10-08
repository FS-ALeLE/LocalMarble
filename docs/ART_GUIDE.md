# 그래픽 · 사진 준비 가이드 — 「홍성 탐험 고고!」

> 그림은 AI 이미지 생성 도구로, 사진은 담당자가 직접 준비합니다. 이 문서는 **무엇을, 어떤 규격으로, 어떤 프롬프트로** 만들지 정리합니다.
> 마감: 기준 이미지 **10/9**, 나머지 그림·사진 **10/12**

---

## 1. 어떤 도구로 만들까

### SVG(코드 그림)는 왜 안 쓰나
- 아이콘, 도장, 버튼처럼 **단순한 모양**은 SVG가 깔끔하고 선명해서 그대로 SVG로 만듭니다(Claude 담당).
- 하지만 **입체감 있는 건물, 지도, 캐릭터**를 코드로 그리면 납작하고 단순해져 미니어처 느낌이 잘 안 납니다. 이런 그림은 AI 이미지 생성이 훨씬 낫습니다.
- Claude는 그림 파일(PNG 등)을 직접 생성하지 못합니다. 그래서 그림은 GPT나 Gemini로 만들고, Claude는 **프롬프트 작성과 게임 적용**을 맡습니다.

### GPT vs Gemini

| | ChatGPT (GPT 이미지) | Gemini |
|---|---|---|
| 장점 | 프롬프트를 잘 따름. **투명 배경 PNG**를 요청할 수 있어 건물·캐릭터를 바로 게임에 올리기 편함 | **참고 이미지를 주고 같은 스타일로 계속 만들기**, 부분 수정이 강함. 생성이 빠름 |
| 단점 | 생성이 조금 느림 | 투명 배경이 잘 안 됨 → 단색 배경으로 만든 뒤 배경 제거 필요 |

**추천: ChatGPT로 통일.** 건물·캐릭터·말이 모두 **투명 배경**이어야 해서 손이 덜 갑니다. Gemini를 이미 익숙하게 쓰신다면 Gemini도 충분하며, 이 경우 배경을 **단색 연두색(#00FF00)** 으로 만들어 주시면 배경 제거는 제가 처리하겠습니다.

> ⚠️ **한 가지 도구로 모든 그림을 만드세요.** 도구를 섞으면 스타일이 달라집니다.

### 일관성을 지키는 방법
1. **기준 이미지(스타일 앵커)** 를 먼저 1장 만들고 확정합니다 (2장 참고).
2. 이후 모든 그림은 **같은 대화창에서**, **기준 이미지를 첨부**하고 "이 이미지와 같은 스타일로"라고 요청합니다.
3. 프롬프트의 **공통 스타일 문장**(아래 `[STYLE]`)을 매번 그대로 붙입니다.
4. **그림 안에 글자를 넣지 않습니다.** AI는 한글을 자주 깨뜨립니다. 장소 이름은 게임 화면에서 글자로 표시합니다.

---

## 2. 공통 스타일 문장 `[STYLE]`

모든 프롬프트 끝에 그대로 붙입니다. (영어가 결과가 더 안정적입니다)

```
[STYLE]
Style: cute miniature diorama, like a handmade toy model on a tabletop.
Isometric 3/4 view from the front-right, camera about 35 degrees above.
Soft rounded shapes, chunky proportions, smooth clay/painted-wood texture.
Soft warm lighting from the upper-left, gentle soft shadow on the ground.
Pastel colors with these accents: ocean navy #2E5E8C, mudflat brown #A07A55,
silver-grass gold #E8C46A, forest green #5E9E6E, vermilion red #E8553D.
Clean, bright, friendly, for elementary school children.
No text, no letters, no signs with writing, no watermark.
```

---

## 3. 만들 그림 목록과 규격

| # | 파일 이름 | 내용 | 크기 · 형식 | 배경 |
|---|---|---|---|---|
| 0 | `style-anchor.png` | **기준 이미지**: 홍주성 역사관 건물 1채 | 정사각형(1024×1024) PNG | 투명 |
| 1 | `map-base.png` | 지도 바탕 (건물 없이 땅·바다·산·논만) | **가로형 최대 크기** (예: 1536×1024) PNG | 불투명 |
| 2~11 | `bld-*.png` | 장소 건물 10채 | 1024×1024 PNG | 투명 |
| 12~13 | `bld-start.png`, `bld-rest.png` | 출발(조양문), 쉼터(정자) | 1024×1024 PNG | 투명 |
| 14 | `bld-chance.png` | 찬스 칸 (보물 상자 받침) | 1024×1024 PNG | 투명 |
| 15~16 | `char-hongi-*.png`, `char-juni-*.png` | 안내 캐릭터 2명 × 표정 4종 | 1024×1024 PNG | 투명 |
| 17 | `piece-*.png` | 플레이어 말 4종 | 1024×1024 PNG | 투명 |
| 18 | `mg-*.png` | 미니게임 그림 | 1024×1024 PNG | 투명 |

- **건물은 지도 그림과 따로** 만듭니다. 지도 바탕은 화면에서 크게 확대되어 조금 흐려질 수 있지만, 건물을 따로 얹으면 건물은 선명하게 보입니다. 칸과 길은 게임 코드로 그립니다.
- 모든 건물은 **같은 크기의 둥근 잔디 받침** 위에 올려, 보드게임 말판 조각처럼 보이게 합니다.
- 저장: 원본 해상도 그대로 PNG. 크기 줄이기와 WebP 변환은 제가 합니다.

---

## 4. 프롬프트

### 4.0 기준 이미지 (가장 먼저, 10/9)

```
A single miniature diorama building piece: a small traditional Korean museum
inspired by the Hongju Fortress History Hall in Hongseong, Korea — tiled roof
with gently curved eaves, stone base, warm wooden pillars.
The building sits on a round grassy base disc, like a board-game tile piece.
Centered, whole object visible, nothing cut off, transparent background.
[STYLE]
```

→ 마음에 들 때까지 몇 번 다시 만들고, **확정한 이미지를 Claude에게 보내 주세요.** 이후 모든 그림의 기준이 됩니다.

### 4.1 장소 건물 (기준 이미지 첨부 + 아래 문장)

공통 앞부분:
```
Using the attached image as the style reference, create another building piece
in exactly the same style, scale, camera angle, lighting, and round grassy base.
Centered, whole object visible, transparent background.
```

| 파일 | 건물 설명 (공통 앞부분 뒤에 붙임) |
|---|---|
| `bld-library.png` | A cozy small library with a traditional Korean tiled roof, big round window, stacks of books and an ink brush and scroll near the door (theme: poet Han Yong-un). |
| `bld-police.png` | A cute small police station, white and navy walls, a blue lamp, a little traffic light and crosswalk in front, a small flag pole with a plain flag (theme: safety and General Kim Jwa-jin). |
| `bld-alley.png` | A narrow village alley with small earthen cave entrances in a hillside where salted-shrimp jars are stored, rows of brown clay pots (onggi) in front. |
| `bld-stadium.png` | A small round sports stadium with a red running track and green field, tiny flags around the rim. |
| `bld-port.png` | A small fishing harbor with a wooden pier, two little colorful fishing boats, a seafood market stall with shrimp and shellfish in baskets, seagulls. |
| `bld-mountain.png` | A small rocky mountain with dramatic but cute granite rock peaks, pine trees, a tiny hiking trail and a small wooden viewpoint deck. |
| `bld-office.png` | A modern provincial government building with a wide plaza, fountain and trees, clean glass and white walls. |
| `bld-gallery.png` | A small traditional Korean house turned into an art museum, with a large abstract ink-painting canvas on an easel in the yard. |
| `bld-village.png` | A small organic farming village: green rice paddy with ducks swimming in it, a little farmhouse, a small school building, vegetable rows. |
| `bld-start.png` | A traditional Korean fortress gate with a two-story pavilion roof on top of a stone arch (inspired by Joyangmun gate of Hongju Fortress). Slightly larger than other pieces. |
| `bld-rest.png` | A small traditional Korean pavilion (jeongja) with a bench under a big zelkova tree. |
| `bld-chance.png` | A cute wooden treasure chest with a glowing light, on the same round base. |

### 4.2 지도 바탕 (건물 없이)

```
Using the attached image as the style reference, create a wide top-down-ish
isometric miniature diorama landscape of a small county on a tabletop:
the sea and tidal mudflats on the left (west) side, green rice fields and
small roads in the middle, a rocky mountain area at the top (north),
golden silver-grass hills at the bottom (south), forests on the right (east).
Leave plenty of empty open flat ground spread across the land where game
pieces will be placed later. NO buildings, no text.
Wide landscape format, the land fills the frame like an island board on a table.
[STYLE]
```

- 건물이 들어갈 **빈 땅이 충분히** 있어야 합니다. 건물이 그려져 나오면 "remove all buildings"로 다시 요청하세요.

### 4.3 안내 캐릭터 (홍이, 주니)

> 홍성군 공식 캐릭터를 쓸 수 있으면 이 단계는 생략합니다.

```
Using the attached image as the style reference, create a cute chibi child
explorer character as a small painted toy figure: [홍이: a boy with a red
explorer cap and a small backpack / 주니: a girl with a yellow headband and
a map in hand], wearing a simple traditional-Korean-inspired vest.
Full body, standing, facing slightly to the left, friendly smile.
Centered, transparent background.
[STYLE]
```

표정 4종 — 확정한 캐릭터 이미지를 첨부하고:
```
Same character, same pose and outfit, only change the expression to: [happy and cheering / surprised / a little sad / thinking with a finger on chin].
Transparent background.
```
파일 이름: `char-hongi-normal.png`, `-happy`, `-sad`, `-think` (주니도 동일)

### 4.4 플레이어 말 4종

```
Using the attached image as the style reference, create a board-game player
piece: a cute [big prawn / small shrimp / Korean brown cow (hanwoo) / white duck]
toy figure standing on a small round vermilion (#E8553D) pedestal.
Centered, whole object visible, transparent background.
[STYLE]
```
파일 이름: `piece-prawn.png`, `piece-shrimp.png`, `piece-cow.png`, `piece-duck.png`

### 4.5 미니게임 그림

| 파일 | 프롬프트 (기준 이미지 첨부 + `[STYLE]`) |
|---|---|
| `mg-prawn.png` | A single cute big prawn jumping, side view, transparent background. |
| `mg-sea.png` | A calm cute sea surface with small waves seen from the front, wide format, no objects. |
| `mg-card-back.png` | A playing card back design with a vermilion and gold traditional Korean pattern, no text, front view, flat. |
| `mg-card-1~4.png` | Four separate cute icons for memory cards: (1) brown salted-shrimp clay jar, (2) golden silver grass, (3) traditional fortress gate, (4) a seaweed (gim) sheet with rice — one per image, centered, transparent background. |

---

## 5. 사진 준비 (담당자)

### 5.1 필요한 사진 (사진 퀴즈 10~15문항 + 해설 카드용)

| 분류 | 사진 |
|---|---|
| 유적·장소 | 홍주읍성 조양문, 홍주성역사관, 용봉산 바위, 오서산 억새, 남당항, 광천 토굴(새우젓 저장 굴), 충남도청(내포), 이응노 생가기념관, 한용운 생가, 김좌진 장군 생가 |
| 특산물 | 광천 새우젓, 광천 김, 대하, 새조개, 홍성 한우 |
| 인물 | 한용운, 김좌진, 이응노 (초상 사진 또는 기념관의 동상·초상화 사진) |

### 5.2 사진 규격

- **가로 사진(4:3)**, 가로 **1200px 이상**, JPG 또는 PNG.
- 워터마크·글자가 없는 사진. 사진만 보고 답을 알 수 있게 **간판이나 이름이 보이지 않는 사진**이 퀴즈용으로 좋음.
- 파일 이름: 영문 소문자 (예: `joyangmun.jpg`, `gwangcheon-togul.jpg`).

### 5.3 출처 기록 (꼭 필요)

사진마다 아래 표를 함께 보내 주세요. 게임 해설 화면에 출처를 작게 표시합니다.

| 파일 이름 | 무엇인가 | 출처 | 이용 조건 |
|---|---|---|---|
| joyangmun.jpg | 홍주읍성 조양문 | 홍성군청 / 직접 촬영 / 공공누리 | 공공누리 제1유형, 허락 받음 등 |

- 사용 가능한 사진: **직접 촬영**, **공공누리 제1유형**(출처 표시 후 자유 이용), **기관에서 허락 받은 사진**.
- 인터넷 블로그·뉴스 사진은 허락 없이 쓰지 않습니다.

---

## 6. 전달 방법과 일정

| 날짜 | 전달할 것 |
|---|---|
| **10/9 (금)** | `style-anchor.png` (기준 이미지) → 확인 후 진행 |
| **10/10 (토)** | 건물 12채 + 찬스, 말 4종 |
| **10/11 (일)** | 캐릭터 2명 × 4표정, 미니게임 그림 |
| **10/12 (월)** | 지도 바탕, 사진 + 출처 표 |

- 전달 위치: 저장소의 `public/regions/hongseong/art/` (그림), `public/regions/hongseong/photos/` (사진)에 올리거나, 채팅으로 보내 주시면 제가 넣겠습니다.
- 그림이 늦어지더라도 게임은 **임시 그림으로 먼저 완성**하고, 파일이 도착하는 대로 바꿔 끼웁니다.
