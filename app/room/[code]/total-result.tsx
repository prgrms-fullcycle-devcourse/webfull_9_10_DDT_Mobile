// app/room/[code]/total-result.tsx
import { Button } from '../../../src/components/ui/Button';
import { View, Text, Pressable, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Home, Share as ShareIcon } from 'lucide-react-native';
import { getResultApi } from '../../../src/api/generated/result-api-결과-조회/result-api-결과-조회';
import axiosClient from '../../../src/api/axiosClient';

export default function TotalResultScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['result', code],
    queryFn: async () => (await getResultApi(axiosClient).resultControllerGetResult(code!)).data as any,
  });

  const penaltyMembers = (data?.members || []).filter((m: any) => m.penaltyCount > 0);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `DDT 집중 완료! 우리 방의 결과를 확인해보세요!\nhttps://ddt-app.com/room/${code}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

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

        <Text className="text-white/50 text-xs font-bold mb-2 ml-1">멤버별 벌칙 결과</Text>
        <View className="gap-3 mb-10">
          {penaltyMembers.length > 0 ? penaltyMembers.map((m: any) => (
            <View key={m.memberId} className="bg-[#151926] border border-white/10 rounded-2xl p-4">
              <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-white/5">
                <Text className="text-white font-bold text-base">{m.nickname}</Text>
                <Text className="text-[#F85A5A] font-bold text-xs">총 {m.penaltyCount}개</Text>
              </View>
              {m.penalties.items.map((p: any, i: number) => (
                <View key={i} className="flex-row justify-between items-center py-1">
                  <Text className="text-white/80 text-sm">- {p.content}</Text>
                  <Text className="text-white/50 text-xs">{p.count}회</Text>
                </View>
              ))}
            </View>
          )) : (
            <View className="bg-[#151926] border border-white/10 rounded-2xl p-6 items-center">
              <Text className="text-white/50">벌칙을 받은 멤버가 없어요! 🎉</Text>
            </View>
          )}
        </View>
      </ScrollView>

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