import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getRoomApi } from '../api/generated/room-api/room-api';
import axiosClient from '../api/axiosClient';

interface RoomContextValue {
  code: string;
  title: string;
  phase: string;
}

const RoomContext = createContext<RoomContextValue | null>(null);

/**
 * 8자리 고유 방 코드를 주입받아 유효성을 HTTP 통신으로 선제 검증하고 하부 트리 컴포넌트 전체에 안전한 방 식별 메타데이터를 전파합니다.
 * @param {Object} props - 룸 프로바이더 크래들 주입 인자
 * @param {string} props.code - 탐색 대상 8자리 고유 방 코드
 * @param {React.ReactNode} props.children - 컨텍스트 영역 내부 렌더링 노드 자식 트리
 * @returns {JSX.Element} 로딩/에러 방어막 및 컨텍스트 스코프 컴포넌트
 */
export function RoomProvider({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['room', code],
    queryFn: async () => {
      const res = await getRoomApi(axiosClient).roomControllerFindById(code);
      return res.data as { title: string; id: string; phase: string; memberCount: number };
    },
  });

  const value = useMemo<RoomContextValue | null>(() => {
    if (!data) return null;
    return {
      code: data.id,
      title: data.title,
      phase: data.phase,
    };
  }, [data]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#050816] items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text className="text-white/50 mt-4 text-sm">방 정보를 불러오는 중...</Text>
      </View>
    );
  }

  // 삭제된 방 코드이거나, 네트워크 크래시, 폭파 완료로 세션 접근이 불가능할 시 하부 화면 마운트를 원천 차단하고 홈으로 이탈 유도 조치
  if (error || !value) {
    return (
      <View className="flex-1 bg-[#050816] items-center justify-center px-6">
        <Text className="text-white text-base font-bold mb-2">
          존재하지 않거나 종료된 방이에요.
        </Text>
        <Text className="text-white/50 text-sm mb-6">방 코드를 다시 확인해주세요.</Text>
        <Pressable
          onPress={() => router.replace('/')}
          className="w-full bg-[#7c3aed] py-4 rounded-2xl items-center"
        >
          <Text className="text-white font-bold text-base">홈으로</Text>
        </Pressable>
      </View>
    );
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

/**
 * 상위 RoomProvider 스코프에서 주입된 검증 완료 스터디 룸의 식별값 및 타이머 상태를 직관적으로 불러옵니다.
 * @returns {RoomContextValue} 정제 가공 완료된 현재 활성 룸의 기본 속성 컨텍스트 데이터
 */
export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
}