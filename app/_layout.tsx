import '../src/lib/polyfills';
import "../global.css";

import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

/**
 * 애플리케이션의 최상위 루트 레이아웃 컴포넌트입니다.
 * 전역 상태 전파를 위한 React Query, 안전 영역(Safe Area) 컨텍스트, 그리고 글로벌 토스트 알림 계층을 초기화합니다.
 * @returns {JSX.Element} 전역 프로바이더들로 감싸진 루트 슬롯 뷰
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* 네이티브 네비게이션 트리 렌더링 영역 */}
        <Slot />
        {/* 화면 최상단 레이어에 배치될 글로벌 알림 토스트 인프라 */}
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}