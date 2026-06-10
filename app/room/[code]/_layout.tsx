// app/room/[code]/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useGlobalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { RoomProvider, useRoom } from '../../../src/contexts/RoomContext';
import { SocketProvider } from '../../../src/contexts/SocketContext';
import { getToken } from '../../../src/lib/token';

export default function JoinedLayout() {
  const { code } = useGlobalSearchParams<{ code: string }>();

  // 앱 환경에서는 SecureStore 정리를 화면 이탈(언마운트) 보다는 
  // 방 완전 종료/퇴장 시점에 하는 것이 안전하므로 여기서는 생략합니다.

  return (
    <RoomProvider code={code!}>
      <SocketWrapper>
        {/* Slot은 현재 하위 라우트(contract, timer 등)를 렌더링하는 Expo Router 컴포넌트입니다. */}
        <Slot />
      </SocketWrapper>
    </RoomProvider>
  );
}

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const room = useRoom();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getToken().then((t) => {
      setToken(t);
      setIsReady(true);
    });
  }, []);

  if (!isReady) return null;

  // 토큰(회원/게스트 인증)이 없는 경우 차단
  if (!token) {
    return (
      <View className="flex-1 bg-[#050816] items-center justify-center px-6">
        <Text className="text-white text-base font-bold mb-2">로그인이 필요해요.</Text>
        <Pressable
          onPress={() => router.replace('/')}
          className="w-full mt-4 bg-[#7c3aed] py-4 rounded-2xl items-center"
        >
          <Text className="text-white font-bold text-base">홈으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SocketProvider roomCode={room.code}>
      {children}
    </SocketProvider>
  );
}