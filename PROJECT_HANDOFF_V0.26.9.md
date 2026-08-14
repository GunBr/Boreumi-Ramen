# V0.26.9 작업 인계

## 현재 버전

- 표시 버전: V0.26.9
- 실제 실행 파일: `script-v0269.js`
- 기본 동기화 파일: `script.js`
- 마지막 화면 보정: `patch-v0269.css`
- 오프라인 캐시: `boreumi-ramen-v0269-0814d`

## 주요 구조

- `#guestMealLayer`: 식사 중인 손님 앞 음식·주류 상차림 전용 레이어
- `refreshGuestStageLayout()`: 좌석 중심과 상차림 위치를 배치 변경 때 한 번 계산
- `State.ppomi.centers`: 뽀미 자동 주류 서빙용 좌석 중심 캐시
- `managedTimer()`: 끝난 손님·포장 타이머를 배열에서 즉시 제거

## 새 그림 자산

- `assets/art-v0269/sign-ramen-moon-v1.webp`: 라면 그릇·보름달·수증기 간판
- `assets/art-v0269/ppomi-walk-strip-v1.webp`: 뽀미 네발 보행 4프레임
- `assets/art-v0269/food-ramen-kimchi-red-v1.webp`: 짙은 적색 김치라면
- `assets/art-v0269/food-ramen-kimchi-egg-red-v1.webp`: 짙은 적색 김치계란라면
- `assets/art-v0269/food-ramen-kimchi-cheese-red-v1.webp`: 짙은 적색 김치치즈라면
- `assets/pwa/icon-180.png`, `icon-192.png`, `icon-512.png`: 새 간판 기반 앱 아이콘

## 다음 작업 시 주의

- `script.js`와 배포용 `script-v0269.js`는 동일하게 유지합니다.
- 화면 변경은 `patch-v0269.css` 뒤에 새 패치 파일을 추가합니다.
- 버전 변경 시 `index.html`, 버전 JS 파일, `service-worker.js` 캐시 이름과 자산 목록을 함께 갱신합니다.
- 빠른 확인은 `index.html?dev`, 전체 검사는 `index.html?qa&silent`를 사용합니다.
