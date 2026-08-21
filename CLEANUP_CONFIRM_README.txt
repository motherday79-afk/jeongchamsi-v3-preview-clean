정참시 v3 alpha6.0.14 · CLEANUP + CONFIRM PATCH ONLY

기준 버전
- alpha6.0.13 적용 상태

적용 방식
- FULL CLEAN 아님
- 전체 프로젝트 덮어쓰기 아님
- ZIP 내부 변경 파일만 기존 프로젝트의 동일 경로에 적용

이번 정리에서 닫은 항목
1. 모바일/폴드 Footer PC버전 보기
- 기존 max-width/media 조건을 여러 번 겹친 구조 제거
- 모바일 UA 또는 터치+화면 크기로 jcv3-touch-ui를 한 번만 판정
- Footer 오른쪽 하단에 단일 버튼 노출
- 일반 모바일: PC버전 보기
- PC모드 전환 후: 모바일버전 보기

2. Vercel Blob 이미지 저장
- BLOB_READ_WRITE_TOKEN, JCV3_BLOB_READ_WRITE_TOKEN, 접두어가 붙은 *_BLOB_READ_WRITE_TOKEN까지 탐색
- /api/v3/health 에 blob: ready | missing 추가
- 관리자 > 시스템에서도 Redis/Blob 상태 확인
- 중요: 프로젝트에 Blob Store/토큰 자체가 없으면 코드는 토큰을 만들어낼 수 없음. 이 경우 Vercel Blob 연결이 1회 필요

3. IT’S ME 글자수
- 제목 30자
- 요약 15자
- 내용 3,000자
- UI maxlength + 서버 Action + 저장 Schema 3중 제한

4. 시민들의 선택
- 선택지 클릭 즉시 투표 제거
- 선택지 선택 → 선택 표시 → 투표 확인 버튼 → 서버 저장
- 메인/설문 전체페이지 모두 동일 방식

5. 중복/덧댐 정리
- Footer 관련 alpha6.0.11/alpha6.0.13 겹침 CSS 제거 후 단일 규칙으로 통합
- !important 0개 유지
- css/app.css는 alpha6.0.13에서 변경 없음

6. 속도
- app.js가 모든 화면 모듈을 처음부터 불러오던 구조 제거
- HOME / 회원 / 게시판 / 관리자 / 기능 페이지별 dynamic import
- 관리자 이미지 처리 코드도 관리자 화면에서만 로드
- HOME 서버 캐시 15초 복원 + 관리자/사용자 변경 직후 같은 브라우저는 revision query로 즉시 최신 HOME 요청
- 소스 기준 예상 gzip: CSS 약 12462 bytes / 초기 HOME 관련 JS 약 16540 bytes

7. 저장구조
- 콘텐츠/회원/활동: Redis Source of Truth
- 이미지: Vercel Blob
- localStorage: 비회원 최근본 + PC/모바일 보기 설정만

8. 권한
- COLUMN/NEWS 등록·수정·삭제 및 이미지 업로드: 관리자
- COMMUNITY/IT’S ME: 회원 본인 글 수정·삭제, 관리자는 전체 관리
- 관리자 콘텐츠 저장 API: requireAdmin 유지
- 이미지 업로드 API: requireAdmin 유지

배포 후 컨펌 순서
A. /api/v3/health → blob 값 확인
B. 모바일 Footer 오른쪽 하단 버튼 확인
C. IT’S ME 30/15/3000 제한 확인
D. 시민들의 선택: 선택만 했을 때 표가 증가하지 않고 '투표 확인' 후 1표 증가하는지 확인
E. 관리자 COLUMN/NEWS 사진 업로드 확인
