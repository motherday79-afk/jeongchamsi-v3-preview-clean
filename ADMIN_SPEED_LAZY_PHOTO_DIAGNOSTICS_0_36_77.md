# 정참시 어드민 속도 핫픽스 0.36.77

## 관리자 헤더 문구
기존:
회원·콘텐츠·참여기능을 동일한 서버 Source of Truth에서 관리합니다

변경:
3대 LLM의 집단사고와 JEONGCHAMSI INTELLIGENT DATA ANALYSIS SYSTEM을 활용하여 OPTIMIZED SOLUTION을 제공합니다.

## 속도 원인
인물관리 탭 첫 진입 때 국회의원/광역단체장/기초단체장 3개 카테고리의
미자산 인물을 Wikimedia resolver로 전부 외부 확인하고 있었습니다.
기초단체장 미자산 수가 많을수록 첫 화면 진입에 수백 건 외부 조회가 붙을 수 있었습니다.

## 수정
- 인물관리 첫 진입의 외부 사진 진단 호출: 3회 -> 0회
- 정참시 자산 수는 로컬 데이터만으로 즉시 표시
- 외부 fallback / 사진 미노출은 해당 진단 항목을 누를 때만 조회
- 같은 카테고리 외부 진단 결과는 120초 클라이언트 캐시
- 사진 저장/삭제/후보 적용 시 진단 캐시 무효화
- 상세 사진 관리자 UI에서 뒤쪽 CSS가 앞 규칙을 덮어쓰던 top-level 중복 규칙 통합
- effective CSS의 !important 사용 0 유지
- 기존 NOW 데이터 센터 문구 변경 유지

## 검증
- 관련 테스트 5/5 통과
- admin.js / app.js 문법 검사 통과
- peoplePanel eager external coverage = 0
- coverage cache = 120s
- CSS !important = 0
- detail admin photo top-level duplicate override = 0
