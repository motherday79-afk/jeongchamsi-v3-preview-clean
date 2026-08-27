# 정참시 관리자 사진관리 정리 0.36.79

## 관리자 상단 문구
Leveraging the Collective Intelligence of Three Leading LLMs and the JEONGCHAMSI Intelligent Data Analysis System, We Deliver Optimized Solutions.

## 사진 공급자
- 표기: `JCS_ASSET`
- `PHOTO_ASSET_542_COMMONS...` 계열 표기 제거
- `Wikimedia + 공식기관 + 정참시 Blob` 보조문구 제거

## 인물관리 정리
유지:
- 국회의원 사진 노출 진단
- 광역단체장 사진 노출 진단
- 기초단체장 사진 노출 진단
- 정참시 자산 / 외부 fallback / 사진 미노출 접이식 진단

제거:
- 사진 수집 3단계 · 직접소스 공략 UI
- 3단계 직접소스 수집 시작 버튼
- 후보 검수함 UI
- 후보 적용 이벤트
- 중앙 정치인 찾기/선택
- 중앙 새 사진 선택/수기등록 workspace
- 중앙 사진 삭제/재수집 버튼
- 위 기능들의 클라이언트 이벤트와 자동 fetch
- 위 기능 전용 dead CSS

## 사진 등록 운영
- 실제 사진 등록/교체는 정치인 상세페이지 관리자 기능으로 일원화
- 상세페이지의 선택 → 미리보기 → 저장 → 자동 최적화 흐름은 유지
- 기존 사진 자산과 public photo resolver는 변경하지 않음
- 과거 stage2/stage3 서버 호환 API는 표시 경로에서 분리되어 유지

## 검증
- 신규 사진관리 통합 테스트 통과
- 공급자/영문 문구 테스트 통과
- 어드민 lazy 사진진단 속도 회귀 테스트 통과
- 상세페이지 사진등록 회귀 테스트 통과
- stage2/stage3 호환 회귀 테스트 통과
- admin.js / app.js / person-meta.js 문법 검사 통과
- production src/css에서 삭제 대상 UI selector/문구 0건
- 전체 테스트: 119/123 통과
  - 잔여 4개는 기존 버전 고정 테스트 2개 + 기존 정치인 분석 UI 테스트 2개
