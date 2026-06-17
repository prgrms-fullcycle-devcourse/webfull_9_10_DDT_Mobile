// app/room/[code]/total-result.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Share, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Home, Share as ShareIcon, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
import { Button } from '../../../src/components/ui/Button';

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

export default function TotalResultScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  const [expandedMembers, setExpandedMembers] = useState<string[]>([]);

  usePreventBack(() => {
    console.log('결과 화면에서는 뒤로 갈 수 없습니다.');
  });

  const { data, isLoading } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `[${data?.roomTitle ?? '감옥'}] 집중 완료!\n우리 방의 결과를 확인해보세요!\nhttps://ddt.app/room/${code}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExpand = (memberId: string) => {
    setExpandedMembers((prev) => 
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#050816] justify-center items-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  const isNoDisruption = data?.allClear;
  const rankedMembers = [...(data?.members || [])].sort((a: any, b: any) => a.rank - b.rank || b.totalEscapeMs - a.totalEscapeMs);
  const penaltyMembers = rankedMembers.filter((m: any) => m.penalties?.totalCount > 0);
  
  const totalTime = formatSessionTime(data?.totalSessionMs ?? null);
  const completedSessions = data?.rule ? `${data.completedRounds ?? 0} / ${data.rule.rounds}` : '-';

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="py-4 items-center border-b border-white/10">
        <Text className="text-white text-lg font-bold">통합 결과</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <View className="items-center mb-8">
          <View className="w-12 h-12 rounded-full bg-[#FBBF24]/20 items-center justify-center mb-3">
            <Trophy color="#FBBF24" size={24} />
          </View>
          <Text className="text-[#FBBF24] text-xl font-bold mb-1">모두 고생했어요!</Text>
          <Text className="text-white/70 text-sm">약속한 집중 시간을 완료했어요.</Text>
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
            <Text className="text-white font-bold">{isNoDisruption ? '0명' : `${data?.penaltyMemberCount ?? 0}명`}</Text>
          </View>
        </View>

        {/* 이탈 시간 순위 */}
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
                    {m.penalties?.totalCount > 0 ? `벌칙 ${m.penalties.totalCount}개` : '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 멤버별 벌칙 결과 */}
        {!isNoDisruption && (
          <>
            <Text className="text-white/50 text-xs font-bold mb-2 ml-1">수감자 별 벌칙 결과</Text>
            <View className="bg-[#151926] rounded-2xl border border-white/10 overflow-hidden mb-10">
              {penaltyMembers.length > 0 ? penaltyMembers.map((m: any, idx: number) => {
                const isMe = me && (me.role === 'user' ? m.userId === me.id : m.guestToken === me.id);
                const avatarSrc = PROFILE_MAP[m.profileImage || 'basic_image_key_01'];
                const isExpanded = expandedMembers.includes(m.memberId);
                const isPending = m.penalties.items.length === 0 && m.penalties.totalCount > 0;

                return (
                  <View key={m.memberId} className={`${idx !== 0 ? 'border-t border-white/5' : ''}`}>
                    <Pressable onPress={() => toggleExpand(m.memberId)} className="flex-row items-center justify-between p-4 active:bg-white/5">
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-8 h-8 rounded-full bg-[#22293F] border border-white/10 overflow-hidden items-center justify-center">
                          <Image source={avatarSrc} className="w-8 h-8" />
                        </View>
                        <Text className={`font-bold ${m.gaveUpAt ? 'text-[#F85A5A]' : 'text-white'}`}>
                          {m.nickname} {m.isHost ? '(방장)' : ''} {isMe ? '(나)' : ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className={`text-xs mr-2 font-bold ${isPending ? 'text-white/40' : 'text-[#F85A5A]'}`}>
                          {isPending ? '벌칙 결정 중' : `총 ${m.penalties.totalCount}개`}
                        </Text>
                        {isExpanded ? <ChevronUp color="gray" size={16} /> : <ChevronDown color="gray" size={16} />}
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View className="bg-[#0f0f1a] px-5 py-3 border-t border-white/5">
                        {isPending ? (
                          <Text className="text-center text-white/50 text-sm py-2">벌칙을 결정하고 있어요.</Text>
                        ) : (
                          m.penalties.items.map((p: any, i: number) => (
                            <View key={i} className="flex-row justify-between items-center py-1.5">
                              <Text className="text-white/80 text-sm flex-1 mr-2">• {p.content}</Text>
                              <Text className="text-white/50 text-xs font-bold">{p.count}회</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              }) : (
                <View className="p-6 items-center">
                  <Text className="text-white/50">벌칙을 받은 수감자가 없어요! 🎉</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 💡 하단 고정 버튼 */}
      <View className="p-4 border-t border-white/10 flex-row gap-3 bg-[#050816]">
        <Button 
          variant="secondary" 
          onPress={handleShare} 
          className="flex-1"
        >
          <View className="flex-row items-center justify-center">
            <ShareIcon color="white" size={16} />
            <Text className="text-white font-bold ml-2 text-[16px]">공유하기</Text>
          </View>
        </Button>

        <Button 
          variant="primary" 
          onPress={() => router.replace('/')} 
          className="flex-1"
        >
          <View className="flex-row items-center justify-center">
            <Home color="white" size={16} />
            <Text className="text-white font-bold ml-2 text-[16px]">홈으로</Text>
          </View>
        </Button>
      </View>
    </SafeAreaView>
  );
}