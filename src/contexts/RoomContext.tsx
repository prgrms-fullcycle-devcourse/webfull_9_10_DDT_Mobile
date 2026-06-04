// src/contexts/RoomContext.tsx
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

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
}