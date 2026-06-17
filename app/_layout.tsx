// app/_layout.tsx
import '../src/lib/polyfills';
import "../global.css";

import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Slot />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}