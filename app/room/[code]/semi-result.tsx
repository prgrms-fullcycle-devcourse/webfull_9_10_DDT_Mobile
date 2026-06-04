// app/room/[code]/semi-result.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ThumbsUp } from 'lucide-react-native';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';

export default function SemiResultScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => {
      const res = await getResultApi(axiosClient).resultControllerGetResult(code!);
      return res.data as any; // 타입 추론 생략
    },
  });

  if (isLoading) return <View className="flex-1 bg-[#050816] justify-center items-center"><ActivityIndicator color="#7c3aed" /></View>;

  const isNoDisruption = data?.allClear;
  const rankedMembers = [...(data?.members || [])].sort((a, b) => a.rank - b.rank);
  const myResult = rankedMembers.find((m) => m.isMe) || rankedMembers[0];
  const shouldShowRoulette = myResult?.remainingSpins > 0;

  // 아무도 이탈하지 않았다면 바로 최종 결과로 스킵
  useEffect(() => {
    if (isNoDisruption) router.replace(`/room/${code}/total-result`);
  }, [isNoDisruption]);

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="py-4 items-center border-b border-white/10"><Text className="text-white text-lg font-bold">결과</Text></View>
      
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="items-center mb-8">
          <Text className="text-3xl mb-2">🎉</Text>
          <Text className="text-[#10B981] text-xl font-bold mb-1">집중시간이 종료되었습니다.</Text>
          <Text className="text-white/50 text-sm">결과를 확인해 주세요.</Text>
        </View>

        <View className="bg-[#1A1F31] rounded-2xl border border-white/10 flex-row py-4 mb-6">
          <View className="flex-1 items-center border-r border-white/10">
            <Text className="text-white/50 text-xs mb-1">벌칙 수행자</Text>
            <Text className="text-white font-bold">{data?.penaltyMemberCount}명</Text>
          </View>
        </View>

        <Text className="text-white/50 text-xs font-bold mb-2 ml-1">이탈 시간 순위</Text>
        <View className="bg-[#151926] rounded-2xl border border-white/10 overflow-hidden mb-6">
          {rankedMembers.map((m: any, i: number) => (
            <View key={m.memberId} className={`flex-row items-center justify-between p-4 ${i !== 0 ? 'border-t border-white/5' : ''}`}>
              <View className="flex-row items-center gap-3">
                {m.isAllClear ? <ThumbsUp color="#FBBF24" size={16} /> : <Text className="text-white/50 w-4 text-center">{m.rank}</Text>}
                <View className="w-8 h-8 rounded-full bg-[#22293F] items-center justify-center"><Text>👤</Text></View>
                <Text className={`font-bold ${m.gaveUpAt ? 'text-[#F85A5A]' : 'text-white'}`}>{m.nickname}</Text>
              </View>
              <Text className="text-white/50 text-xs">{m.penaltyCount > 0 ? `벌칙 ${m.penaltyCount}개` : '-'}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-white/10">
        <Pressable 
          onPress={() => router.push(`/room/${code}/${shouldShowRoulette ? 'roulette' : 'total-result'}`)}
          className="w-full bg-[#7c3aed] py-4 rounded-2xl items-center"
        >
          <Text className="text-white font-bold text-base">{shouldShowRoulette ? '룰렛 돌리기' : '다음'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}