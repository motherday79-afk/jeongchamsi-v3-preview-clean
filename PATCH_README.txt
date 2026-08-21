정참시 v3 alpha6.0.12 PATCH ONLY

적용 기준
- 기준 버전: alpha6.0.11
- 전체 프로젝트 덮어쓰기용이 아닙니다.
- ZIP 안의 변경 파일만 기존 프로젝트의 동일 경로에 덮어쓰면 됩니다.
- 폴더 구조는 그대로 유지되어 있습니다.

변경 파일
1. src/views/home.js
2. server/v3/routes/home.js
3. src/version.js
4. package.json
5. index.html

수정 내용
- 메인 국회의원 전국 평가제에 어드민에서 선택한 평가 대상 즉시 반영
- 메인에 현재 평가 대상 / 활성 상태 / 긍정 비율 / 참여 인원 표시
- IT’S ME 메인 6개 카드에 실제 최신 정책 게시글 최대 6개 표시
- 게시글 부족 시 남은 카드에 '아직 등록된 정책이 없습니다' 표시
- 기존 IT’S ME 카드 레이아웃 크기 유지
- HOME 캐시를 no-store로 변경해 관리자 저장 내용이 메인에 바로 반영
- alpha6.0.11 Footer PC버전 보기 수정 유지

작업 원칙
- PATCH ZIP = 변경 파일만 포함
- FULL CLEAN ZIP = 구조 전체 변경 때만 사용
