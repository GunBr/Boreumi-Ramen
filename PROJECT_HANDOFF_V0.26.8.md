# V0.26.8 작업 인계

## 현재 버전

- 표시 버전: V0.26.8
- 실제 실행 파일: `script-v0268.js`
- 마지막 화면 보정: `patch-v0268.css`
- 오프라인 캐시: `boreumi-ramen-v0268-0814a`

## 새 게임 규칙

- 손님 식사: 10초
- 퇴장 후 재입장: 5초
- 포장 완료 후 재주문: 30초
- 최대 좌석: 5석
- 주류: 뽀미 자동 서빙 전용
- 오뎅·군만두: 3→2→1→3 자동 보충

## 새 그림 자산

- `assets/art-v0268/boreumi-tongs-v1.webp`: 대파·김치·치즈용 집게 동작
- `assets/art-v0268/guest-eating-strip-v1.webp`: 라면·오뎅·군만두 식사 동작 묶음

## 다음 작업 시 주의

- `script.js`와 배포용 `script-v0268.js`는 동일하게 유지합니다.
- 화면 변경은 `patch-v0268.css` 뒤에 새 패치 파일을 추가하는 방식이 안전합니다.
- 버전 변경 시 `index.html`, 버전 JS 파일, `service-worker.js` 캐시 이름과 자산 목록을 함께 갱신합니다.
- 빠른 확인은 `index.html?dev`, 전체 검사는 `index.html?qa&silent`를 사용합니다.
