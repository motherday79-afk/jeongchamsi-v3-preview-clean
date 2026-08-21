정참시 v3 alpha6.0.17 · DATA PHASE 1 — 국회의원 공식 데이터 연결

기준 버전
- alpha6.0.16

원칙
- 사진 수집/저장 없음
- 외부 API는 관리자 동기화 때만 호출
- 사용자 화면은 Redis에 저장된 정참시 데이터만 읽음
- 기존 국회의원 300 Slot 유지
- 공식 의원코드(MONA_CD) 기준으로 Slot 매핑을 보존하여 재동기화 시 ID가 흔들리지 않게 처리

공식 출처
- 대한민국 국회 열린국회정보
- 국회의원 인적사항 API: nwvrqwxyaytdsfvhu

1차 연결 필드
- 이름 / 한자명 / 영문명
- 정당 / 선거구 / 선거유형
- 생년 / 성별
- 선수
- 소속위원회
- 주요 약력·경력
- 연락처 / 공식 홈페이지
- 제22대 임기

아직 비어 있는 필드
- 득표율 / 상세 선거이력
- 대표발의 / 본회의 출석 등 세부 의정활동
- 공약 / 정책
위 항목은 중앙선관위 + 국회 추가 공식 데이터로 다음 데이터 단계에서 연결합니다.

필수 환경변수
OPEN_ASSEMBLY_API_KEY

적용 후 순서
1. Vercel → Project → Settings → Environment Variables
2. OPEN_ASSEMBLY_API_KEY 등록
3. Production + Preview 적용
4. Redeploy
5. /api/v3/health 에 assemblyApi:"ready" 확인
6. 관리자 → 인물 관리 → 국회의원 공식데이터 동기화
