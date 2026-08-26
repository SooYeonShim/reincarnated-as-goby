# 고비 매치 (Goby Match)

망둥어/해수어 소재 3매치(비주얼드류) 게임. `index.html`을 브라우저에서 열면 바로 플레이할 수 있습니다.

## 실행 방법

`index.html`을 더블클릭해서 열거나, 로컬 서버로 열어도 됩니다.

```
python -m http.server 8000
```
후 `http://localhost:8000` 접속.

## 게임 규칙

- 8x8 보드에서 타일을 클릭 → 인접 타일을 클릭하면 스왑을 시도합니다.
- 3개 이상 맞추면 제거되고 점수 획득. 4개 매치는 보너스 + 특수 타일(피스톨 쉬림프, 가로/세로 한 줄 제거) 생성, 5개 매치는 십자 범위 제거 특수 타일이 됩니다.
- 한 번의 스왑으로 연쇄(콤보)가 일어나면 콤보 단계마다 점수 배율이 올라갑니다.
- 점수가 1000점 늘어날 때마다 비주얼 노벨 스타일 대화 장면이 나오면서 오프닝 스토리가 이어집니다 (`story.js`에 8개 챕터로 분할되어 있음). 8000점 이후로는 토스트 메시지만 뜹니다 — 이어지는 이야기를 추가하려면 `story.js`의 `STORY_CHAPTERS` 배열에 챕터를 더 넣으면 됩니다.

## 이미지 자리표시자 안내 (`images/` 폴더)

지금 폴더에 있는 PNG들은 전부 `generate_placeholders.ps1`로 생성한 **자리표시자**입니다. 같은 파일명으로 실제 그림을 덮어쓰면 바로 반영됩니다 (코드 수정 불필요).

| 파일명 | 용도 | 권장 사양 |
|---|---|---|
| `bg_main.png` | 화면 전체 배경. 망둥어가 크게 보이는 메인 비주얼 | 1920x1080 이상, 가로형 |
| `vn_bg.png` | 1000점마다 나오는 대화 장면의 배경 (갯벌/해수어항 등) | 1920x1080 |
| `vn_portrait_human.png` | 대화 장면 인물 초상화 — 변신 전 인간 정민 (1~4번째 챕터) | 900x1400, 투명 배경 PNG 권장 |
| `vn_portrait_goby.png` | 대화 장면 인물 초상화 — 변신 후 고비 정민 (5번째 챕터부터) | 900x1400, 투명 배경 PNG 권장 |
| `tile_diamond_goby.png` | 매치3 타일 — 다이아몬드 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_randall_goby.png` | 매치3 타일 — 랜달 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_fire_goby.png` | 매치3 타일 — 파이어 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_yellow_watchman_goby.png` | 매치3 타일 — 옐로우 와치맨 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_yellow_rock_goby.png` | 매치3 타일 — 옐로우 락 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_helfrich_goby.png` | 매치3 타일 — 헬프리치 고비 | 256x256, 정사각형, 투명 배경 |
| `tile_pistol_shrimp.png` | 4매치/5매치로 생성되는 특수 타일 (피스톨 쉬림프, 줄 제거용) | 256x256, 정사각형, 투명 배경 |

타일 이미지는 정사각형 캔버스에 여백 없이 꽉 채우는 편이 카드 배경과 잘 어울립니다.

## 캐릭터가 화면에 작게 나올 때 — 투명 여백 자동 트림

`vn_portrait_*.png`처럼 캔버스보다 캐릭터가 작게 그려진 그림을 그대로 넣으면, 게임 화면에서도 그 비율 그대로 작게 표시됩니다 (여백까지 포함해서 박스에 맞추기 때문). 캐릭터 주변 투명 여백을 자동으로 잘라내려면:

```
powershell -ExecutionPolicy Bypass -File trim_transparent.ps1
```

인자 없이 실행하면 `images/` 폴더의 PNG 전부(배경용 `bg_main.png`, `vn_bg.png` 제외)를 자동으로 트림합니다. 특정 파일만 하려면:

```
powershell -ExecutionPolicy Bypass -File trim_transparent.ps1 -Path images\vn_portrait_human.png
```

원본은 `파일명.original.png`로 자동 백업되니 안심하고 실행해도 됩니다. 여백을 좀 더 남기고 싶으면 `-PaddingPercent 8` 처럼 값을 조절하세요 (기본 4%).

### 전신 그림을 "머리~허벅지"만 나오게 확대하기

전신을 그린 그림은 투명 여백을 다 잘라내도 발끝까지 다 들어있는 채로 표시됩니다. 화면에는 머리부터 허벅지까지만 크게 보이게 하려면 `-KeepTopPercent`로 위에서부터 몇 %만 남길지 지정하세요 (다리/발 부분은 잘려나감):

```
powershell -ExecutionPolicy Bypass -File trim_transparent.ps1 -Path images\vn_portrait_human.png,images\vn_portrait_goby.png -KeepTopPercent 62
```

62%가 대략 "머리~허벅지" 정도의 기본값입니다. 무릎까지 보이게 하고 싶으면 70~75, 가슴 위주로 더 확대하고 싶으면 45~50 정도로 낮추면서 결과를 보고 조절하면 됩니다.
