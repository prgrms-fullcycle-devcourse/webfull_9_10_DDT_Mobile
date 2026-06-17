import React, { useEffect, useState } from 'react';
import { Slot, useGlobalSearchParams, useRouter, useSegments } from 'expo-router'; 
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoomProvider, useRoom } from '../../../src/contexts/RoomContext';
import { SocketProvider } from '../../../src/contexts/SocketContext';
import { getToken, setToken } from '../../../src/lib/token';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { getAuthApi } from '../../../src/api/generated/인증-auth-api/인증-auth-api';
import axiosClient from '../../../src/api/axiosClient';
import { Button } from '../../../src/components/ui/Button';

/**
 * 특정 방(Room) 도메인 하위에 속하는 모든 화면(입장 폼, 대기실, 타이머 등)을 감싸는 중첩 레이아웃입니다.
 * RoomProvider를 통해 진입한 방의 존재 여부를 1차 검증하고 컨텍스트를 하달합니다.
 * @returns {JSX.Element} 방 스코프 레이아웃 래퍼
 */
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

/**
 * 게스트 토큰 발급 및 사용자의 라우팅 위치를 감지하여 웹소켓 연결의 활성화 시점을 최적화하는 래퍼 컴포넌트입니다.
 * @param {Object} props - 하위 컴포넌트 노드
 * @returns {JSX.Element | null} 소켓이 주입된 트리 또는 게스트 인증 대기 화면
 */
function SocketWrapper({ children }: { children: React.ReactNode }) {
  const room = useRoom();
  const router = useRouter();
  const segments = useSegments(); 
  
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // 라우트 세그먼트 배열의 마지막 요소가 '[code]' 문자열과 정확히 일치한다면, 아직 방에 완전히 접속하지 않고 '입장 전 폼(index.tsx)'에 머물러 있는 상태임을 의미함
  const isJoinPage = segments[segments.length - 1] === '[code]';

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setIsReady(true);
    });
  }, []);

  if (!isReady) return null;

  // 인가 토큰이 아예 없는 비회원 유저가 초대 링크를 타고 직행했을 때, 진입 전 게스트용 임시 토큰을 강제 발급받도록 안내하는 인터셉트 화면 렌더링
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

  // 입장 폼 화면에서는 아직 백엔드의 Join 검증(비밀번호, 정원 체크)을 통과하지 않은 상태이므로 웹소켓 커넥션을 미리 열지 않고 대기함
  if (isJoinPage) {
    return <>{children}</>;
  }

  // 폼을 뚫고 계약서(contract) 등 실 룸 내부 라우트로 전환된 이후에만 공식 소켓 파이프라인 개방
  return (
    <SocketProvider roomCode={room.code}>
      {children}
    </SocketProvider>
  );
}