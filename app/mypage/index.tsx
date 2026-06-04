// app/mypage/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, ChevronLeft, Settings, LogOut} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getUsers } from '../../src/api/generated/users-사용자/users-사용자';
import axiosClient from '../../src/api/axiosClient';

const PROFILE_OPTIONS = [
  { key: 'basic_image_key_01', src: require('../../assets/images/avatars/bear.png') },
  { key: 'basic_image_key_02', src: require('../../assets/images/avatars/cat.png') },
  { key: 'basic_image_key_03', src: require('../../assets/images/avatars/crocodile.png') },
  { key: 'basic_image_key_04', src: require('../../assets/images/avatars/fox.png') },
  { key: 'basic_image_key_05', src: require('../../assets/images/avatars/hedgehog.png') },
  { key: 'basic_image_key_06', src: require('../../assets/images/avatars/monkey.png') },
  { key: 'basic_image_key_07', src: require('../../assets/images/avatars/penguin.png') },
  { key: 'basic_image_key_08', src: require('../../assets/images/avatars/pig.png') },
  { key: 'basic_image_key_09', src: require('../../assets/images/avatars/rabbit.png') },
  { key: 'basic_image_key_10', src: require('../../assets/images/avatars/shiba.png') },
];

const formatDuration = (ms: number) => {
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}시간 ${mins}분`;
  if (hours > 0) return `${hours}시간`;
  return `${mins}분`;
};

export default function MyPageScreen() {
  const router = useRouter();
  const { me, logout } = useAuthStore();
  
  const [stats, setStats] = useState({ totalRoomCount: 0, totalFocusMs: 0, totalEscapeMs: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersApi = getUsers(axiosClient);
        const [statsRes, historyRes] = await Promise.all([
          usersApi.usersControllerGetMyStats(),
          usersApi.usersControllerGetMyHistory({ limit: 3 })
        ]);
        setStats((statsRes.data as any) || { totalRoomCount: 0, totalFocusMs: 0, totalEscapeMs: 0 });
        setHistory((historyRes.data as any)?.sessions?.slice(0, 3) || []);
      } catch (err) {
        console.error('마이페이지 정보 로딩 실패', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '로그아웃', 
        style: 'destructive', 
        onPress: async () => {
          await logout();
          router.replace('/');
        } 
      }
    ]);
  };

  const profileImage = PROFILE_OPTIONS.find(o => o.key === me?.profileImage)?.src || PROFILE_OPTIONS[0].src;

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.replace('/')} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">마이페이지</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => router.push('/mypage/edit')} className="p-2">
            <Settings color="white" size={22} />
          </Pressable>
          <Pressable onPress={handleLogout} className="p-2">
            <LogOut color="#F85A5A" size={22} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6">
          {/* 프로필 섹션 */}
          <View className="flex-row items-center mb-6">
            <View className="w-16 h-16 rounded-full border-2 border-[#7c3aed] bg-[#1A1A2E] overflow-hidden">
              <Image source={profileImage} className="w-full h-full" resizeMode="cover" />
            </View>
            <View className="ml-4">
              <Text className="text-white text-xl font-bold">{me?.nickname}</Text>
              <Text className="text-white/50 text-sm">{me?.role === 'guest' ? '게스트 계정' : '일반 회원'}</Text>
            </View>
          </View>

          {/* 통계 섹션 */}
          <View className="flex-row flex-wrap gap-3 mb-8">
            <View className="flex-1 bg-[#1D1C2C] p-4 rounded-xl items-center justify-center">
              <Text className="text-[#767481] text-xs mb-1">참여한 방</Text>
              <Text className="text-white text-lg font-bold">{stats.totalRoomCount}회</Text>
            </View>
            <View className="flex-1 bg-[#0B241A] p-4 rounded-xl items-center justify-center">
              <Text className="text-[#767481] text-xs mb-1">총 완료 시간</Text>
              <Text className="text-white text-lg font-bold">{formatDuration(stats.totalFocusMs)}</Text>
            </View>
            <View className="flex-1 bg-[#2A0E16] p-4 rounded-xl items-center justify-center">
              <Text className="text-[#767481] text-xs mb-1">총 이탈 시간</Text>
              <Text className="text-[#F85A5A] text-lg font-bold">{formatDuration(stats.totalEscapeMs)}</Text>
            </View>
          </View>

          {/* 최근 참여 기록 */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white/60 font-bold text-sm">최근 참여 기록</Text>
            <Pressable onPress={() => router.push('/mypage/history')} className="flex-row items-center">
              <Text className="text-white/50 text-xs">전체 보기</Text>
              <ChevronRight color="gray" size={14} />
            </Pressable>
          </View>

          <View className="gap-3 mb-8">
            {history.length > 0 ? history.map((item, idx) => (
              <View key={idx} className="bg-[#151926] border border-white/10 rounded-2xl p-4">
                <Text className="text-white font-bold text-base mb-1">{item.roomTitle}</Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-white/50 text-xs">참여 {item.memberCount}명</Text>
                  <Text className="text-[#F85A5A] text-xs">이탈 {formatDuration(item.totalEscapeMs)}</Text>
                </View>
              </View>
            )) : (
              <View className="bg-[#151926] border border-white/10 rounded-2xl p-6 items-center">
                <Text className="text-white/50 text-sm">참여 기록이 없습니다.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}