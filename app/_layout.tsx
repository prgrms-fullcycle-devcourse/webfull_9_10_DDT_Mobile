import '../src/lib/polyfills';

import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 💡 1. 추가된 임포트

// 💡 2. QueryClient 인스턴스 생성
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    // 💡 3. QueryClientProvider로 앱 전체 영역 감싸기
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}