# 정참시 앱 1차 업데이트 · Firebase 연결 가이드

푸시를 제외한 기능은 Firebase 설정 없이도 동작합니다. 실제 푸시 테스트를 하려면 아래 값만 연결합니다.

## 1. Firebase 프로젝트
1. Firebase Console에서 프로젝트 생성
2. Android 앱 추가
3. Android package name: `com.jeongchamsi.preview`
4. Project settings > General에서 아래 값 확인
   - Web API Key → `FIREBASE_API_KEY`
   - App ID → `FIREBASE_APP_ID`
   - Project ID → `FIREBASE_PROJECT_ID`
   - Project number / Sender ID → `FIREBASE_SENDER_ID`
5. Cloud Messaging API 활성화

## 2. GitHub Actions Secrets
GitHub 저장소 > Settings > Secrets and variables > Actions > New repository secret 에 4개 등록:
- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SENDER_ID`

그 뒤 Actions > Build Jeongchamsi APK 실행. Artifact 이름은 `jeongchamsi-android-update1-apk`.

## 3. Vercel 서버 환경변수
Firebase Console > Project settings > Service accounts에서 새 private key JSON을 발급하고 Vercel V3 프로젝트에 다음 환경변수 등록:
- `FIREBASE_PROJECT_ID`: Firebase Project ID
- `FIREBASE_SERVICE_ACCOUNT_JSON`: 서비스 계정 JSON 전체 내용

환경변수 적용 후 V3 재배포.

## 4. 테스트 순서
1. 새 APK 설치 및 로그인
2. Android 알림 권한 허용
3. 앱에서 V3 메인 1회 로드 → FCM token 자동 등록
4. V3 Admin > 푸시 알림
5. `테스트 발송`으로 최근 등록 기기 1대 확인
6. 이미지/클릭 이동까지 확인 후 `전체 테스트기기 발송`

## 로그인 유지
- Android WebView 쿠키를 강제 삭제하지 않고 onPause/onStop/onDestroy에서 flush
- V3 서버 로그인 세션을 90일로 확장
- 직접 로그아웃, 앱 데이터 삭제, 서버 세션키 변경 시에는 다시 로그인 필요
