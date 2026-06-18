# 📱 DDT (디지털 디톡스 타이머) - Mobile App

> **"남들이 딴짓할 때, 우리는 서로를 가두고 집중한다."**

DDT(디지털 디톡스 타이머)는 스마트폰의 유혹에서 벗어나 목표한 시간 동안 온전히 집중할 수 있도록 돕는 서비스입니다. 본 레포지토리는 DDT 서비스의 **React Native (Expo) 기반 모바일 프론트엔드 애플리케이션**입니다. 모바일 기기의 특성을 활용하여 사용자의 앱 이탈(백그라운드 전환)을 정밀하게 감지하고, 팀원들과의 실시간 상호작용을 네이티브 환경에서 매끄럽게 제공합니다.

---

## 📝 프로젝트 소개

스마트폰 중독과 집중력 저하를 해결하기 위해 기획된 모바일 앱 서비스입니다. 방 코드를 통해 친구들과 대기실에 모여 목표 시간과 휴식 시간을 정합니다. 앱을 백그라운드로 내리거나 다른 앱을 켜는 등 '딴짓'을 하면 즉각적으로 이탈 시간이 누적되며, 세션 종료 후 이탈 누적 시간에 따라 룰렛을 돌려 벌칙을 받게 됩니다.

---

## ✨ 주요 기능

* **실시간 방 참여 및 게스트 로그인** : 구글 소셜 로그인 및 1회성 게스트 토큰을 발급하여 8자리 코드로 손쉽게 방에 입장합니다.
* **계약서 동시 편집 (모바일)** : 팀원들이 실시간으로 목표 시간과 벌칙을 모바일 인터페이스에서 동시에 작성하고 수정할 수 있습니다.
* **백그라운드 이탈 감지 타이머** : 모바일 기기의 OS 상태(AppState)를 추적하여 집중 시간 도중 앱 화면을 벗어나면 즉각적으로 서버에 이탈 신호를 전송하고 경고 알림을 띄웁니다.
* **네이티브 벌칙 룰렛** : 세션 종료 시 남은 벌칙 횟수만큼 SVG와 네이티브 애니메이션으로 구현된 룰렛을 직접 돌려 벌칙을 확정합니다.
* **클립보드 및 소셜 공유** : 방 초대 코드나 최종 집중 결과(리포트)를 모바일 OS의 네이티브 공유 기능을 통해 메신저로 즉시 전달할 수 있습니다.

---

## 🛠 기술 스택

* **Core / Framework** : React Native, Expo, Expo Router
* **Language** : TypeScript
* **State Management** : Zustand (전역 상태), TanStack Query (서버 상태)
* **Data Fetching & API** : Axios, Orval (OpenAPI 스펙 기반 API 클라이언트 자동 생성)
* **Realtime Communication** : Socket.io-client, Yjs, y-websocket
* **Styling** : NativeWind (Tailwind CSS)
* **Native Features** : Expo SecureStore, Expo Notifications, React Native SVG

---

## 💡 주요 기술적 성과 및 구현 포인트

* **모바일 환경의 CRDT 실시간 동시 편집 (Yjs + Polyfills)** React Native의 JavaScriptCore/Hermes 런타임에는 Node.js나 Web 브라우저의 기본 API가 내장되어 있지 않아 Yjs 구동 시 크래시가 발생합니다. 이를 해결하기 위해 `expo-crypto`와 `fast-text-encoding`을 활용하여 모바일 환경에 맞는 **Polyfill을 전역 주입**하고, 모바일 키보드 타이핑에 최적화된 동시 편집 UI를 구현했습니다.
* **OS 라이프사이클 기반의 정밀한 이탈 감지 (AppState)**
사용자가 집중 세션 중 홈 버튼을 누르거나 다른 앱으로 전환하는 것을 잡아내기 위해 React Native의 `AppState`를 활용했습니다. 앱이 `inactive`나 `background`로 전환되는 즉시 Socket으로 이탈 시작(`escape:start`) 패킷을 쏘고, 로컬 푸시 알림을 예약하여 사용자의 빠른 복귀를 유도했습니다.
* **Orval을 활용한 API 계층 자동화 및 타입 안정성**
백엔드의 OpenAPI 스펙 문서를 `Orval`로 파싱하여 프론트엔드의 API 호출 함수와 DTO(Data Transfer Object) 타입을 100% 자동 생성(`src/api/generated`)했습니다. 이를 통해 백엔드 명세가 변경될 때마다 모바일 앱의 타입이 자동으로 동기화되어 런타임 에러를 원천 차단했습니다.
* **SVG 기반의 커스텀 인터랙티브 룰렛 구현**
서드파티 룰렛 라이브러리에 의존하지 않고, `react-native-svg`의 Path 아크(Arc) 연산과 React Native의 `Animated` API를 활용하여 룰렛을 직접 드로잉했습니다. 네이티브 드라이버(`useNativeDriver`)를 위임하여 렌더링 병목 없이 60fps의 부드러운 스핀 연출을 달성했습니다.
* **안전한 토큰 관리 및 네트워크 재연결 아키텍처**
JWT 인가 토큰과 방장의 임시 비밀번호를 일반 스토리지가 아닌 OS 레벨의 암호화 저장소(`Expo SecureStore`)에 보관하여 하이재킹을 방어했습니다. 또한 앱이 백그라운드에서 오랜 시간 홀딩되었다가 켜질 때 끊어진 웹소켓 세션을 자동으로 감지하고 재연결(Reconnection)하는 복구 로직을 설계했습니다.

---

## 📂 프로젝트 구조

```text
ddt-mobile/
├── app/                  # Expo Router 기반의 파일 기반 라우팅 화면 (auth, mypage, room 등)
├── src/
│   ├── api/              # Orval 자동 생성 API 클라이언트 및 Axios 인터셉터 설정
│   ├── components/       # 도메인별(timer, contract) 및 공통(ui) 컴포넌트
│   ├── contexts/         # Socket.io 및 현재 방(Room) 데이터 전역 Context
│   ├── hooks/            # useYjsContract, usePreventBack 등 커스텀 훅
│   ├── store/            # Zustand 전역 상태 관리 (useAuthStore, useRoomStore)
│   └── lib/              # Polyfills, 토큰 암호화, 푸시 알림 등 유틸리티 함수
└── assets/               # 아바타 이미지, 배경, 폰트 등 정적 리소스

```

---

## 🚀 시작하기

프로젝트 루트 경로에서 아래 가이드에 따라 앱을 실행할 수 있습니다.

**1. 패키지 설치**

```bash
# pnpm을 사용하여 전체 의존성을 설치합니다.
pnpm install

```

**2. 환경 변수 설정**
루트 디렉토리에 `.env` 파일을 생성하고 아래 환경 변수를 기입합니다. (참고: `.env.example`)

```env
EXPO_PUBLIC_API_URL=http://your-backend-api-url.com

```

**3. 개발 서버 실행**

```bash
# Expo 개발 서버를 구동합니다.
pnpm start
# 또는
npx expo start

```

* 실행 후 터미널에 나타나는 QR 코드를 **Expo Go** 앱(Android/iOS)으로 스캔하여 실기기에서 테스트할 수 있습니다.
* 네이티브 빌드가 필요한 경우 `pnpm run android` 또는 `pnpm run ios` 명령어를 사용하세요.