# 정참시 v3 Performance Budget

메인 레이아웃은 정적 UI를 먼저 렌더하고 HOME 데이터는 짧은 TTL의 단일 snapshot으로 갱신합니다.

목표:
- TTFB < 500ms
- FCP < 1.0s
- LCP < 1.8s
- CLS < 0.05
- 초기 JS / CSS 최소화
- 정치인 목록 543개는 외부 이미지 요청 0
- 인물 카드에 `content-visibility:auto` 적용하여 긴 목록의 렌더링 비용 절감
- 정치인 실데이터 / 사진 runtime 검색 0
- HOME에서 정치인 데이터 API 호출 0

대표사진:
- 관리자 업로드 시 브라우저에서 최대 1200px 기준으로 압축
- 과도한 원본 이미지는 저장 전 차단
- 향후 Object Storage 연결 시 이미지 Provider만 교체 가능하도록 콘텐츠 데이터와 분리 가능

`?perf=1`을 붙이면 현재 브라우저 성능 오버레이를 확인할 수 있습니다.
