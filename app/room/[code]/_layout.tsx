// app/room/[code]/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useGlobalSearchParams, useRouter, useSegments } from 'expo-router'; // 💡 useSegments 추가
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoomProvider, useRoom } from '../../../src/contexts/RoomContext';
import { SocketProvider } from '../../../src/contexts/SocketContext';
import { getToken, setToken } from '../../../src/lib/token';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { getAuthApi } from '../../../src/api/generated/인증-auth-api/인증-auth-api';
import axiosClient from '../../../src/api/axiosClient';
import { Button } from '../../../src/components/ui/Button';

export default function JoinedLayout() {
  const { code } = useGlobalSearchParams<{ code: string }>();

  return (
    <RoomProvider code={code!}>
      <SocketWrapper>
        <Slot />
      </SocketWrapper>
    </RoomProvider>
  );
}

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const room = useRoom();
  const router = useRouter();
  const segments = useSegments(); // 💡 현재 라우트 경로 배열 가져오기
  
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // 💡 마지막 경로가 '[code]'이면 index.tsx(방 입장 전 화면)임을 의미함
  const isJoinPage = segments[segments.length - 1] === '[code]';

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setIsReady(true);
    });
  }, []);

  if (!isReady) return null;

  if (!tokenState) {
    const handleGuestStart = async () => {
      setIsGuestLoading(true);
      try {
        const res = await getAuthApi(axiosClient).authControllerGuestLogin();
        const data = res.data as { accessToken: string };
        await setToken(data.accessToken);
        await fetchMe();
        setTokenState(data.accessToken);
      } catch (error) {
        Alert.alert('오류', '게스트 로그인에 실패했습니다.');
      } finally {
        setIsGuestLoading(false);
      }
    };

    return (
      <SafeAreaView className="flex-1 bg-[#050816] justify-center px-6">
        <View className="bg-[#1E2538] p-6 rounded-3xl gap-2">
          <Text className="text-white text-xl font-bold mb-1">어떤 계정으로 입장할까요?</Text>
          <Text className="text-white/50 text-sm mb-6 leading-relaxed">
            로그인을 하면 집중 기록이 저장돼요.
          </Text>
          <View className="flex-row gap-3">
            <Button 
              title="게스트로 시작" 
              variant="secondary" 
              className="flex-1" 
              isLoading={isGuestLoading}
              onPress={handleGuestStart} 
            />
            <Button 
              title="로그인하기" 
              className="flex-1" 
              onPress={() => router.push('/terms')} 
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 💡 입장 페이지(index.tsx)에 머물러 있을 때는 소켓 연결을 하지 않고 화면만 렌더링!
  if (isJoinPage) {
    return <>{children}</>;
  }

  // 💡 입장하기를 누르고 계약서(contract) 등 내부 페이지로 이동했을 때만 소켓 연결
  return (
    <SocketProvider roomCode={room.code}>
      {children}
    </SocketProvider>
  );
}