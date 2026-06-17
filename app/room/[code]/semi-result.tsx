// app/room/[code]/semi-result.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ThumbsUp } from 'lucide-react-native';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { usePreventBack } from '../../../src/hooks/usePreventBack';

const PROFILE_MAP: Record<string, any> = {
  basic_image_key_01: require('../../../assets/images/avatars/bear.png'),
  basic_image_key_02: require('../../../assets/images/avatars/cat.png'),
  basic_image_key_03: require('../../../assets/images/avatars/crocodile.png'),
  basic_image_key_04: require('../../../assets/images/avatars/fox.png'),
  basic_image_key_05: require('../../../assets/images/avatars/hedgehog.png'),
  basic_image_key_06: require('../../../assets/images/avatars/monkey.png'),
  basic_image_key_07: require('../../../assets/images/avatars/penguin.png'),
  basic_image_key_08: require('../../../assets/images/avatars/pig.png'),
  basic_image_key_09: require('../../../assets/images/avatars/rabbit.png'),
  basic_image_key_10: require('../../../assets/images/avatars/shiba.png'),
};

const formatSessionTime = (totalMs: number | null) => {
  if (totalMs === null) return '-';
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}분`;
  if (minutes <= 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
};

const formatEscapeTime = (totalMs: number) => {
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds.toString().padStart(2, '0')}초`;
};

export default function SemiResultScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.me);

  // 뒤로가기 차단
  usePreventBack(() => {
    console.log('결과 화면에서는 뒤로 갈 수 없습니다.');
  });

  const { data, isLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => {
      const res = await getResultApi(axiosClient).resultControllerGetResult(code!);
      return res.data as any;
    },
  });

  const isNoDisruption = data?.allClear;
  const rankedMembers = [...(data?.members || [])].sort((a: any, b: any) => a.rank - b.rank || b.totalEscapeMs - a.totalEscapeMs);
  
  // 💡 내 정보 찾기 (guestToken 또는 userId로 매칭)
  const myResult = me ? rankedMembers.find((member: any) => 
    me.role === 'user' ? member.userId === me.id : member.guestToken === me.id
  ) : null;
  const shouldShowRoulette = (myResult?.remainingSpins ?? 0) > 0;
  
  const totalTime = formatSessionTime(data?.totalSessionMs ?? null);
  const completedSessions = data?.rule ? `${data.completedRounds ?? 0} / ${data.rule.rounds}` : '-';

  // 아무도 이탈하지 않았다면 바로 최종 결과로 스킵
  useEffect(() => {
    if (isNoDisruption) {
      router.replace(`/room/${code}/total-result`);
    }
  }, [isNoDisruption, code, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#050816] justify-center items-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="py-4 items-center border-b border-white/10">
        <Text className="text-white text-lg font-bold">결과</Text>
      </View>
      
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="items-center mb-8">
          <Text className="text-4xl mb-2">🎉</Text>
          <Text className="text-[#10B981] text-xl font-bold mb-1">집중시간이 종료되었습니다.</Text>
          <Text className="text-white/50 text-sm">결과를 확인해 주세요.</Text>
        </View>

        {/* 💡 3단 요약 통계 */}
        <View className="bg-[#1A1F31] rounded-2xl border border-white/10 flex-row py-4 mb-6">
          <View className="flex-1 items-center border-r border-white/10">
            <Text className="text-white/50 text-xs mb-1">총 수감 시간</Text>
            <Text className="text-white font-bold">{totalTime}</Text>
          </View>
          <View className="flex-1 items-center border-r border-white/10">
            <Text className="text-white/50 text-xs mb-1">완료한 반복 횟수</Text>
            <Text className="text-white font-bold">{completedSessions}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white/50 text-xs mb-1">벌칙 대상자</Text>
            <Text className="text-white font-bold">{data?.penaltyMemberCount ?? 0}명</Text>
          </View>
        </View>

        <Text className="text-white/50 text-xs font-bold mb-2 ml-1">이탈 시간 순위</Text>
        <View className="bg-[#151926] rounded-2xl border border-white/10 overflow-hidden mb-6">
          {rankedMembers.map((m: any, i: number) => {
            const isMe = me && (me.role === 'user' ? m.userId === me.id : m.guestToken === me.id);
            const avatarSrc = PROFILE_MAP[m.profileImage || 'basic_image_key_01'];

            return (
              <View key={m.memberId} className={`flex-row items-center justify-between p-4 ${i !== 0 ? 'border-t border-white/5' : ''}`}>
                <View className="flex-row items-center gap-3 flex-1">
                  {m.isAllClear ? (
                    <ThumbsUp color="#FBBF24" size={16} />
                  ) : (
                    <Text className="text-white/50 w-4 text-center">{m.rank}</Text>
                  )}
                  
                  <View className="w-8 h-8 rounded-full bg-[#22293F] border border-white/10 overflow-hidden items-center justify-center">
                    <Image source={avatarSrc} className="w-8 h-8" />
                  </View>
                  
                  <View className="flex-1">
                    <Text className={`font-bold ${m.gaveUpAt ? 'text-[#F85A5A]' : 'text-white'} flex-shrink`} numberOfLines={1}>
                      {m.nickname} {m.isHost ? '(방장)' : ''} {isMe ? '(나)' : ''}
                      {m.gaveUpAt ? ' (탈옥)' : ''}
                    </Text>
                  </View>
                </View>
                
                <View className="items-end pl-2">
                  <Text className="text-white/30 text-[10px] mb-0.5">{formatEscapeTime(m.totalEscapeMs)}</Text>
                  <Text className="text-white/50 text-xs font-bold">
                    {m.penaltyCount > 0 ? `벌칙 ${m.penaltyCount}개` : '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-white/10">
        <Pressable 
          onPress={() => router.push(`/room/${code}/${shouldShowRoulette ? 'roulette' : 'total-result'}`)}
          className="w-full bg-[#7c3aed] py-4 rounded-2xl items-center active:opacity-80"
        >
          <Text className="text-white font-bold text-base">
            {shouldShowRoulette ? '룰렛 돌리기' : '다음'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}