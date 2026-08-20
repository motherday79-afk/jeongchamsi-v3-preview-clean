# 정참시 v3.0.0-alpha.1.1 · SPEED FOUNDATION

v3 독립 Preview의 첫 개발 기준선.

## 이번 단계
- 서버/API 연결 없음: 초기 렌더 차단 API 0개
- 외부 폰트/외부 JS 없음
- `?perf=1` 성능 계측기 기본 탑재
- `PERFORMANCE_BUDGET.md`로 속도 예산 고정
- 다음 단계부터 모든 기능은 이 예산 안에서만 이관

## 배포
현재 `jeongchamsi-v3-preview-clean` 저장소에 PATCH 파일을 같은 경로로 업로드해 덮어쓴다.
Vercel은 GitHub Commit 후 자동 배포한다.
