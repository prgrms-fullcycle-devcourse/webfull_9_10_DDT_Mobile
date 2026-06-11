import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { getRouletteApi } from '../../../src/api/generated/roulette-api-벌칙-룰렛/roulette-api-벌칙-룰렛';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';
import { PenaltyRoulette } from '../../../src/components/ui/CustomRoulette';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/store/useAuthStore';

export default function RouletteScreen() {
  const { code, from } = useLocalSearchParams<{ code: string; from?: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  
  // 💡 URL 파라미터로 중도 포기 유저인지 판별
  const isGiveUpRoulette = from === 'giveup';

  const [isSpinning, setIsSpinning] = useState(false);
  const [resultPenalty, setResultPenalty] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);

  // 💡 룰렛이 돌아가고 있을 때 뒤로가기 차단
  usePreventBack(() => {
    if (isSpinning) {
      console.log('룰렛이 회전 중에는 나갈 수 없습니다.');
    } else {
      router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
    }
  });

  // 1. 일반 결과 조회 (중도 포기가 아닐 때)
  const { data: resultData, isLoading: isResultLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
    enabled: !isGiveUpRoulette,
  });

  // 2. 중도 포기 결과 조회 (중도 포기일 때)
  const { data: giveUpData, isLoading: isGiveUpLoading } = useQuery({
    queryKey: ['giveUpResult', code],
    queryFn: async () => (await getRouletteApi(axiosClient).rouletteControllerGetGiveUpResult(code!)).data as any,
    enabled: isGiveUpRoulette,
  });

  const isLoading = isGiveUpRoulette ? isGiveUpLoading : isResultLoading;

  // 💡 룰렛 판에 표시될 전체 벌칙 목록 (penaltyPool)
  const penaltyItems = useMemo(() => {
    const rawPool = isGiveUpRoulette ? giveUpData?.penaltyPool : resultData?.rule?.penalties;
    if (!rawPool || rawPool.length === 0) return [];
    return rawPool.map((p: any) => p.content);
  }, [giveUpData, resultData, isGiveUpRoulette]);

  // 💡 중도 포기 전용: 서버에서 확정된 내 벌칙 목록을 1개씩(flat) 펼쳐서 섞음
  const giveUpSpinResults = useMemo(() => {
    const penalties = giveUpData?.penalties ?? [];
    const flat: any[] = [];
    penalties.forEach((p: any) => {
      for (let i = 0; i < p.count; i++) {
        flat.push(p);
      }
    });
    return flat.sort(() => Math.random() - 0.5); // 랜덤 섞기
  }, [giveUpData]);

  // 💡 일반 룰렛 API 뮤테이션
  const spinMutation = useMutation({
    mutationFn: async (spinIndex: number) => {
      const res = await getRouletteApi(axiosClient).rouletteControllerSpinRoulette(code!, { spinIndex });
      return res.data as any;
    },
  });

  // 💡 남은 횟수 계산
  const myResult = useMemo(() => {
    if (!resultData || !me) return null;
    if (me.role === 'user') return resultData.members.find((m: any) => m.userId === me.id);
    return resultData.members.find((m: any) => m.guestToken === me.id);
  }, [me, resultData]);

  const totalChances = isGiveUpRoulette 
    ? giveUpSpinResults.length 
    : Math.max(0, (myResult?.penalties?.totalCount ?? 0) - (myResult?.penaltyCount ?? 0));
    
  const remainingChances = Math.max(0, totalChances - spinCount);

  // 벌칙 목록이 없으면 바로 결과(혹은 홈) 화면으로 스킵
  useEffect(() => {
    if (!isLoading && penaltyItems.length === 0) {
      router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
    }
  }, [isLoading, penaltyItems.length, code, isGiveUpRoulette, router]);

  const handleSpin = () => {
    if (remainingChances <= 0) return;
    setResultPenalty(null);

    if (isGiveUpRoulette) {
      // 💡 중도 포기: API 호출 없이 프론트에서 가짜 스핀 애니메이션만 실행
      const target = giveUpSpinResults[spinCount];
      if (!target) return;
      const index = penaltyItems.findIndex((item: string) => item === target.content);
      setTargetIndex(index !== -1 ? index : 0);
      setIsSpinning(true);
    } else {
      // 💡 일반 룰렛: API 실제 호출
      const nextSpinIndex = (myResult?.penaltyCount ?? 0) + spinCount + 1;
      spinMutation.mutate(nextSpinIndex, {
        onSuccess: (data) => {
          const index = penaltyItems.findIndex((item: string) => item === data.penaltyContent);
          setTargetIndex(index !== -1 ? index : 0);
          setIsSpinning(true);
        },
        onError: (err: any) => {
          Alert.alert('오류', err.response?.data?.message || '룰렛 실행에 실패했습니다.');
        }
      });
    }
  };

  const handleStopSpinning = () => {
    setIsSpinning(false);
    
    // 스핀 결과 텍스트 저장
    const currentContent = isGiveUpRoulette 
      ? giveUpSpinResults[spinCount]?.content 
      : spinMutation.data?.penaltyContent;
      
    setResultPenalty(currentContent);
    setSpinCount(prev => prev + 1);

    // 💡 방금 멈춘 스핀이 마지막 스핀이었다면, 2초 뒤 자동 이동
    if (remainingChances - 1 <= 0) {
      setTimeout(() => {
        router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816] items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">벌칙 뽑기</Text>
        <Pressable 
          disabled={isSpinning} 
          onPress={() => router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`)}
        >
          <X color={isSpinning ? "gray" : "white"} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full bg-[#111827] border border-white/10 rounded-3xl items-center justify-center overflow-hidden py-8">
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
        <Button 
          title={
            spinMutation.isPending 
              ? '당첨 벌칙 확인 중...' 
              : isSpinning
                ? '룰렛 돌리는 중...'
                : remainingChances <= 0
                  ? '결과 확인하기'
                  : `룰렛 돌리기 (${remainingChances}/${totalChances})`
          }
          disabled={isSpinning || spinMutation.isPending || remainingChances <= 0}
          isLoading={spinMutation.isPending}
          onPress={handleSpin}
        />
      </View>
    </SafeAreaView>
  );
}