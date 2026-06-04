# 📱 DDT (디지털 디톡스 타이머) - Mobile App

> **"남들이 딴짓할 때, 우리는 서로를 가두고 집중한다."** > 계약하고 집중하고 벌칙으로 완성하는 실시간 강제 집중 스터디 앱입니다.

## 🚀 프로젝트 소개
DDT(디지털 디톡스 타이머)는 스마트폰의 유혹에서 벗어나 목표한 시간 동안 온전히 집중할 수 있도록 돕는 서비스입니다. 방 코드를 통해 친구들과 대기실에 모여 목표 시간과 휴식 시간을 정하고, 집중을 방해받아 이탈한 사용자에게는 룰렛을 통해 벌칙을 부여합니다.

본 레포지토리는 DDT 서비스의 **React Native (Expo)** 기반 모바일 프론트엔드 애플리케이션입니다.

## 🛠 기술 스택 (Tech Stack)
- **Core:** React Native, Expo (Expo Router)
- **Language:** TypeScript
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query), Axios
- **Real-time Communication:** Socket.io-client
- **API Client Generation:** Orval (OpenAPI)
- **Styling:** NativeWind (Tailwind CSS)
- **Storage:** Expo SecureStore (토큰 등 민감 정보 암호화 저장)

## 📁 주요 폴더 구조
```text
ddt-mobile/
├── app/               # Expo Router 기반 화면 라우팅
├── src/
│   ├── api/           # Orval 자동 생성 API 클라이언트 및 Axios 설정
│   ├── components/    # 재사용 가능한 UI 컴포넌트
│   ├── contexts/      # Socket 및 전역 Context
│   ├── hooks/         # 커스텀 훅
│   ├── store/         # Zustand 전역 상태 관리
│   └── lib/           # 유틸리티 함수 (포맷팅, 스토리지 등)
└── assets/            # 폰트, 이미지 등 정적 리소스