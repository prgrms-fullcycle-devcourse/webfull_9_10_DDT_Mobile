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

/**
 * 사용자가 과거에 정상 완료 및 중도 포기하여 이탈 기록이 남은 전체 스터디 히스토리 목록 데이터를 페이지네이션 조히하여 무한 리스트 형태로 출력하는 전체 이력 조회 스크린입니다.
 * @returns {JSX.Element} 스크롤 뷰 형태의 누적 참여 이력 카드 보드 UI
 */
export default function MyPageHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // 단기 MVP 마일스톤 단계의 컴팩트한 사용성을 고려해 스크롤 시 파편 리스트를 한꺼번에 읽어오도록 일단 큰 수치(limit: 50)로 가상 고정 할당
        // TODO: 추후 대용량 데이터 유입 및 렌더링 최적화를 위해 FlatList와 OnEndReached 훅 조합 기반 무한 스크롤 고도화 권장
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