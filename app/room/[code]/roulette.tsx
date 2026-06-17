import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { getRouletteApi } from '../../../src/api/generated/roulette-api-벌칙-룰렛/roulette-api-벌칙-룰렛';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';
import { PenaltyRoulette } from '../../../src/components/ui/CustomRoulette';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/store/useAuthStore';

// 💡 스포트라이트 애니메이션 오버레이 컴포넌트 추가
function SpotlightOverlay({ label }: { label: string }) {
  return (
    <View className="absolute top-0 left-0 right-0 bottom-0 z-50 justify-center items-center bg-black/85">
      <View className="bg-white/10 px-6 py-2 rounded-full mb-4 border border-white/20">
        <Text className="text-white/80 text-sm font-bold">벌칙 확정</Text>
      </View>
      <Text className="text-white text-3xl font-extrabold text-center px-4" style={{ textShadowColor: 'rgba(255,255,255,0.7)', textShadowRadius: 20 }}>
        {label}
      </Text>
    </View>
  );
}

export default function RouletteScreen() {
  const { code, from } = useLocalSearchParams<{ code: string; from?: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  
  const isGiveUpRoulette = from === 'giveup';

  const [isSpinning, setIsSpinning] = useState(false);
  const [resultPenalty, setResultPenalty] = useState<string | null>(null);
  const [spotlightLabel, setSpotlightLabel] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // 1. 일반 결과 조회
  const { data: resultData, isLoading: isResultLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
    enabled: !isGiveUpRoulette,
  });

  // 2. 중도 포기 결과 조회
  const { data: giveUpData, isLoading: isGiveUpLoading } = useQuery({
    queryKey: ['giveUpResult', code],
    queryFn: async () => (await getRouletteApi(axiosClient).rouletteControllerGetGiveUpResult(code!)).data as any,
    enabled: isGiveUpRoulette,
  });

  const isLoading = isGiveUpRoulette ? isGiveUpLoading : isResultLoading;

  const penaltyItems = useMemo(() => {
    const rawPool = isGiveUpRoulette ? giveUpData?.penaltyPool : resultData?.rule?.penalties;
    if (!rawPool || rawPool.length === 0) return [];
    return rawPool.map((p: any) => p.content);
  }, [giveUpData, resultData, isGiveUpRoulette]);

  const giveUpSpinResults = useMemo(() => {
    const penalties = giveUpData?.penalties ?? [];
    const flat: any[] = [];
    penalties.forEach((p: any) => {
      for (let i = 0; i < p.count; i++) {
        flat.push(p);
      }
    });
    return flat.sort(() => Math.random() - 0.5);
  }, [giveUpData]);

  const spinMutation = useMutation({
    mutationFn: async (spinIndex: number) => {
      const res = await getRouletteApi(axiosClient).rouletteControllerSpinRoulette(code!, { spinIndex });
      return res.data as any;
    },
  });

  // 💡 자동 전체 공개(나가기) API 호출
  const exitMutation = useMutation({
    mutationFn: async () => {
      await getRouletteApi(axiosClient).rouletteControllerExitRoulette(code!);
    },
    onSuccess: () => {
      setIsExitDialogOpen(false);
      router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
    },
    onError: () => {
      setIsExitDialogOpen(false);
      Toast.show({ type: 'error', text1: '오류', text2: '처리 중 문제가 발생했어요.' });
    }
  });

  const myResult = useMemo(() => {
    if (!resultData || !me) return null;
    if (me.role === 'user') return resultData.members.find((m: any) => m.userId === me.id);
    return resultData.members.find((m: any) => m.guestToken === me.id);
  }, [me, resultData]);

  const totalChances = isGiveUpRoulette 
    ? giveUpSpinResults.length 
    : Math.max(0, (myResult?.penalties?.totalCount ?? 0) - (myResult?.penaltyCount ?? 0));
    
  const remainingChances = Math.max(0, totalChances - spinCount);

  // 💡 룰렛 진행 중 뒤로가기 버튼 액션
  usePreventBack(() => {
    if (isSpinning) return;
    if (remainingChances > 0) {
      setIsExitDialogOpen(true);
    } else {
      router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
    }
  });

  useEffect(() => {
    if (!isLoading && penaltyItems.length === 0) {
      router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
    }
  }, [isLoading, penaltyItems.length, code, isGiveUpRoulette, router]);

  const handleSpin = () => {
    if (remainingChances <= 0) return;
    setResultPenalty(null);
    setSpotlightLabel(null);

    if (isGiveUpRoulette) {
      const target = giveUpSpinResults[spinCount];
      if (!target) return;
      const index = penaltyItems.findIndex((item: string) => item === target.content);
      setTargetIndex(index !== -1 ? index : 0);
      setIsSpinning(true);
    } else {
      const nextSpinIndex = (myResult?.penaltyCount ?? 0) + spinCount + 1;
      spinMutation.mutate(nextSpinIndex, {
        onSuccess: (data) => {
          const index = penaltyItems.findIndex((item: string) => item === data.penaltyContent);
          setTargetIndex(index !== -1 ? index : 0);
          setIsSpinning(true);
        },
        onError: (err: any) => {
          Toast.show({ type: 'error', text1: '오류', text2: err.response?.data?.message || '실패했습니다.' });
        }
      });
    }
  };

  const handleStopSpinning = () => {
    setIsSpinning(false);
    
    const currentContent = isGiveUpRoulette 
      ? giveUpSpinResults[spinCount]?.content 
      : spinMutation.data?.penaltyContent;
      
    setResultPenalty(currentContent);
    setSpinCount(prev => prev + 1);

    // 💡 스포트라이트 표시 (2.4초 후 사라짐)
    if (currentContent) {
      setSpotlightLabel(currentContent);
      setTimeout(() => setSpotlightLabel(null), 2400);
    }

    if (remainingChances - 1 <= 0) {
      setTimeout(() => {
        router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
      }, 3000);
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
      {/* 💡 스포트라이트 오버레이 */}
      {spotlightLabel && <SpotlightOverlay label={spotlightLabel} />}

      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="w-8" />
        <Text className="text-white text-lg font-bold">벌칙 뽑기</Text>
        <Pressable 
          disabled={isSpinning} 
          onPress={() => {
            if (remainingChances > 0) setIsExitDialogOpen(true);
            else router.replace(isGiveUpRoulette ? '/' : `/room/${code}/total-result`);
          }}
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

      {/* 💡 나가기(자동 공개) 모달 */}
      <Modal visible={isExitDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-6">
          <View className="bg-[#1E2538] p-6 rounded-3xl gap-4">
            <Text className="text-white text-lg font-bold">결정할 벌칙이 아직 남았어요.</Text>
            <Text className="text-white/50 text-sm mb-4">지금 나가면 벌칙이 자동으로 결정돼요.</Text>
            <View className="flex-row gap-3">
              <Button 
                title="취소" 
                variant="secondary" 
                className="flex-1" 
                disabled={exitMutation.isPending}
                onPress={() => setIsExitDialogOpen(false)} 
              />
              <Button 
                title="나가기" 
                className="flex-1" 
                isLoading={exitMutation.isPending}
                disabled={exitMutation.isPending}
                onPress={() => exitMutation.mutate()} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}