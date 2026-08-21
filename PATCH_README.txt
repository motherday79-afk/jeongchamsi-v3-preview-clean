정참시 v3 alpha6.0.15 · GLOBAL INTERACTION POLISH

기준 버전
- alpha6.0.14 적용 상태

PATCH ONLY
- FULL CLEAN 아님
- 전체 프로젝트 덮어쓰기 아님
- ZIP 안 변경 파일만 동일 경로에 적용

디자인 정리
- 상단 삼선바 / 내 참여 / 최근 본 정치인 아이콘을 문자기호에서 통일된 SVG 라인아이콘으로 교체
- 헤더 아이콘 hover / active / keyboard focus 추가
- 알림형 아이콘에는 짧은 bell nudge, 별 아이콘에는 미세 회전 피드백
- 더보기 / 기본 버튼 / 보조 버튼 / 위험 버튼 인터랙션 규칙 통일
- 탭 / 마이페이지 메뉴 / 최근 본 정치인 목록 hover/focus 통일
- IT’S ME / COLUMN / COMMUNITY / 정치인 카드에 미세한 hover lift + shadow
- 좋아요 / 투표 / 평가 선택에 즉각적인 클릭 피드백
- Drawer close / 사이드 action affordance 정리
- prefers-reduced-motion 지원

보존
- PC/모바일/Fold 레이아웃 크기 변경 없음
- 폰트 크기 변경 없음
- css/app.css 변경 없음
- 기능/권한/저장구조 변경 없음
- !important 0개
- Vercel Function 1개 유지

원칙
- hover에서 margin/padding/border-width를 변경하지 않음
- transform/background/shadow/opacity 중심이라 CLS 유발 없음
