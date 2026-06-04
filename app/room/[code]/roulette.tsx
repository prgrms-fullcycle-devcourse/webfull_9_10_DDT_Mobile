import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { getRouletteApi } from '../../../src/api/generated/roulette-api-벌칙-룰렛/roulette-api-벌칙-룰렛';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';
// 네이티브 룰렛 임포트
import { PenaltyRoulette } from '../../../src/components/ui/CustomRoulette';

export default function RouletteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultPenalty, setResultPenalty] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);

  const { data: resultData } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
  });

  const penaltyItems = resultData?.rule?.penalties?.map((p: any) => p.content) || ['벌칙을 불러오는 중'];

  const spinMutation = useMutation({
    mutationFn: async (spinIndex: number) => {
      const res = await getRouletteApi(axiosClient).rouletteControllerSpinRoulette(code!, { spinIndex });
      return res.data as any;
    },
    onSuccess: (data) => {
      // 서버에서 당첨된 벌칙이 리스트의 몇 번째인지 인덱스 찾기
      const index = penaltyItems.findIndex((item: string) => item === data.penaltyContent);
      setTargetIndex(index !== -1 ? index : 0);
      setIsSpinning(true);
    }
  });

  const handleStopSpinning = () => {
    setIsSpinning(false);
    setResultPenalty(spinMutation.data?.penaltyContent);
    setSpinCount(prev => prev + 1);

    if (spinMutation.data?.isFinished) {
      setTimeout(() => router.replace(`/room/${code}/total-result`), 2000);
    }
  };

  const handleSpin = () => {
    setResultPenalty(null);
    spinMutation.mutate(spinCount + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">벌칙 뽑기</Text>
        <Pressable onPress={() => router.replace(`/room/${code}/total-result`)}>
          <X color="white" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full bg-[#111827] border border-white/10 rounded-3xl items-center justify-center overflow-hidden py-8">
          {/* 네이티브 룰렛 적용 */}
          <PenaltyRoulette 
            mustStartSpinning={isSpinning}
            targetIndex={targetIndex}
            onStopSpinning={handleStopSpinning}
            items={penaltyItems}
          />
          <View className="mt-8 h-12 justify-center">
            {resultPenalty ? (
              <Text className="text-[#FBBF24] text-2xl font-bold text-center px-4">{resultPenalty}</Text>
            ) : (
              <Text className="text-white/50 text-lg">버튼을 눌러 뽑아주세요</Text>
            )}
          </View>
        </View>
      </View>

      <View className="p-6 pb-8">
        <Pressable 
          disabled={isSpinning || spinMutation.isPending}
          onPress={handleSpin}
          className={`w-full py-4 rounded-2xl items-center ${isSpinning ? 'bg-white/20' : 'bg-[#7c3aed]'}`}
        >
          {spinMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">{isSpinning ? '뽑는 중...' : '벌칙 뽑기'}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}