// app/room/[code]/roulette.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { getRouletteApi } from '../../../src/api/generated/roulette-api-벌칙-룰렛/roulette-api-벌칙-룰렛';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';

export default function RouletteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultPenalty, setResultPenalty] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState(0);

  const { data: resultData } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
  });

  const spinMutation = useMutation({
    mutationFn: async (spinIndex: number) => {
      const res = await getRouletteApi(axiosClient).rouletteControllerSpinRoulette(code!, { spinIndex });
      return res.data as any;
    },
    onSuccess: (data) => {
      setIsSpinning(true);
      // 룰렛 돌아가는 효과 (1.5초 후 결과 표시)
      setTimeout(() => {
        setIsSpinning(false);
        setResultPenalty(data.penaltyContent);
        setSpinCount(prev => prev + 1);
        if (data.isFinished) {
          setTimeout(() => router.replace(`/room/${code}/total-result`), 2000);
        }
      }, 1500);
    }
  });

  const handleSpin = () => {
    setResultPenalty(null);
    spinMutation.mutate(spinCount + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">벌칙 뽑기</Text>
        <Pressable onPress={() => router.replace(`/room/${code}/total-result`)}><X color="white" /></Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full aspect-square bg-[#111827] border border-white/10 rounded-full items-center justify-center overflow-hidden">
          {isSpinning ? (
            <ActivityIndicator size="large" color="#7c3aed" />
          ) : resultPenalty ? (
            <Text className="text-[#FBBF24] text-2xl font-bold text-center px-4">{resultPenalty}</Text>
          ) : (
            <Text className="text-white/50 text-lg">버튼을 눌러 뽑아주세요</Text>
          )}
        </View>
      </View>

      <View className="p-6">
        <Pressable 
          disabled={isSpinning || spinMutation.isPending}
          onPress={handleSpin}
          className={`w-full py-4 rounded-2xl items-center ${isSpinning ? 'bg-white/20' : 'bg-[#7c3aed]'}`}
        >
          <Text className="text-white font-bold text-base">{isSpinning ? '뽑는 중...' : '벌칙 뽑기'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}