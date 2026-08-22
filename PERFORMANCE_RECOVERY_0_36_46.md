# 정참시 v3 0.36.46 · PERFORMANCE RECOVERY

## 원인
0.36.44~0.36.45에서 게시된 NOW 데이터가 메인과 실시간 사이드바에 연결되면서 `/api/v3/home`이 542명 전체 `nowDataCurrent`를 읽고 브라우저로 전달했다. 각 정치인 row에는 검색량과 최대 12개 뉴스 헤드라인이 포함되어 있어 홈이 필요로 하는 TOP10에 비해 과도한 payload가 발생했다.

또한 NOW 관리자 상태 GET은 55개 전체 batch 본문과 542명 current snapshot을 다시 읽었고, 관리자 대시보드는 6개 content API + 전체 회원목록을 단순 count 용도로 불러왔다.

## 수정
- publish 시 `nowDataPublicHome` 생성: TOP10 + 정치키워드 + 급상승만 저장
- 홈 fast path는 `nowDataPublicHome`만 읽고 542명 전체 snapshot을 전송하지 않음
- 키워드/급상승 계산을 매 홈 요청이 아니라 publish 시 1회 계산
- 정치인 상세용 `nowDataPersonPublic:<id>` 개별 snapshot 생성
- 상세 API는 해당 정치인 1명 key를 우선 조회
- 관리자 draft ranked 542 rows를 `nowDataDraftRanked:<draftId>`로 분리
- 관리자 상태는 `nowDataBatchStatus:<draftId>:<index>` 소형 상태 key만 조회
- history/top30에서는 뉴스 headline payload 제거
- 관리자 대시보드는 `/api/v3/admin/dashboard` 1회 요청으로 count만 수신
- 기존 0.36.45 게시 데이터는 첫 조회 시 compact snapshot으로 1회 자동 migration

## 호환성
- `nowDataCurrent` 전체 source snapshot은 유지
- 기존 NOW 수집/점수/게시 기능 유지
- 기존 메인 NOW Rank, 실시간 정치키워드, 급상승 정치인, 상세페이지 UI 유지
- V2 runtime 없음
