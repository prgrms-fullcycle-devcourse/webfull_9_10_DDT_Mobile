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

/**
 * 당첨된 벌칙 결과를 강조하여 띄우는 시각적 스포트라이트 포커스 애니메이션 렌더링 오버레이 컴포넌트입니다.
 * @param {Object} props - 출력할 당첨 확정 벌칙 라벨 텍스트
 * @returns {JSX.Element} 검은 반투명 필터 레이어
 */
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

/**
 * 딴짓이나 탈옥으로 인해 누적 이탈 시간이 티어를 초과한 대상자가 자신에게 부과된 잔여 페널티 횟수만큼 벌칙 휠을 직접 스핀하는 인터랙티브 게이미피케이션 스크린입니다.
 * @returns {JSX.Element} 메인 룰렛 보드 및 남은 스핀 횟수 제어 UI
 */
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

  // 일반 완주자의 룰렛 진입 결과 로드용 쿼리
  const { data: resultData, isLoading: isResultLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
    enabled: !isGiveUpRoulette,
  });

  // 중간 포기(탈옥) 유저의 경우 일반 리절트 엔드포인트 접근이 차단되므로 전용 기브업 라우트로 분기 조회
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

  // 벌칙 스핀 횟수가 남았음에도 고의로 화면을 이탈하려 하거나 타임아웃(rage-quit)이 발생했을 시, 나머지 기회를 서버단에서 자동 무작위 차감 확정시켜버리는 방어 백도어 트리거
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

  // 사용자가 아직 다 소모하지 못한 벌칙 횟수가 있는데 뒤로가기 제스처를 긁었을 경우, 이를 블로킹하고 자동 전면 페널티 확정 징수 안내 모달을 출력
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

    // 사용자의 시선을 집중시키기 위해 스포트라이트 오버레이를 트리거하고 시각 피로도를 고려해 2.4초 뒤 자연 페이드 아웃 연출
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