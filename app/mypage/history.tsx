// app/mypage/history.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { getUsers } from '../../src/api/generated/users-사용자/users-사용자';
import axiosClient from '../../src/api/axiosClient';

const formatDuration = (ms: number) => {
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}시간 ${mins}분`;
  if (hours > 0) return `${hours}시간`;
  return `${mins}분`;
};

export default function MyPageHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // limit을 크게 줘서 일단 전체 목록 느낌으로 로드 (앱 고도화 시 FlatList + 무한스크롤 권장)
        const res = await getUsers(axiosClient).usersControllerGetMyHistory({ limit: 50 });
        setHistory((res.data as any)?.sessions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <Pressable onPress={() => router.back()} className="p-2">
          <ChevronLeft color="white" size={28} />
        </Pressable>
        <Text className="text-white text-lg font-bold ml-2">전체 참여 기록</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {history.length > 0 ? history.map((item, idx) => (
            <View key={idx} className="bg-[#151926] border border-white/10 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-white font-bold text-base flex-1">{item.roomTitle}</Text>
                <Text className="text-white/40 text-xs">{new Date(item.endedAt).toLocaleDateString()}</Text>
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-white/50 text-xs">참여 {item.memberCount}명</Text>
                <Text className="text-[#F85A5A] text-xs font-bold">이탈 {formatDuration(item.totalEscapeMs)}</Text>
              </View>
            </View>
          )) : (
            <View className="bg-[#151926] border border-white/10 rounded-2xl p-6 items-center mt-4">
              <Text className="text-white/50 text-sm">참여 기록이 없습니다.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}