import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { Button } from '../src/components/ui/Button';

export default function Home() {
  const router = useRouter();
  
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const me = useAuthStore((state) => state.me);

  const handleOpenTerms = () => {
    Alert.alert('로그인', '구글 로그인 화면으로 이동합니다.');
  };

  const handleOpenCodeDialog = () => {
    Alert.alert('방 코드 입력', '방 코드 입력 모달 띄우기');
  };

  return (
    <View className="flex-1 bg-[#050816]">
      {/* 배경 그라데이션 및 이미지 효과가 들어갈 자리 */}
      <View className="absolute inset-0 bg-black/40 z-0" />

      <SafeAreaView className="flex-1 z-10 px-6 pb-8">
        {/* 우측 상단 로그인 / 마이페이지 버튼 */}
        <View className="flex-row justify-end pt-4">
          {isLoggedIn && me?.role === 'user' ? (
            <Button
              title="마이페이지"
              variant="outline"
              className="px-3 py-2 w-auto rounded-md h-auto"
              onPress={() => router.push('/mypage')}
            />
          ) : isLoggedIn && me?.role === 'guest' ? (
            <Button
              title="로그아웃"
              variant="outline"
              className="px-3 py-2 w-auto rounded-md h-auto"
              onPress={() => useAuthStore.getState().logout()}
            />
          ) : (
            <Button
              title="로그인"
              variant="outline"
              className="px-3 py-2 w-auto rounded-md h-auto"
              onPress={handleOpenTerms}
            />
          )}
        </View>

        {/* 메인 카피 영역 */}
        <View className="flex-1 justify-center mt-8">
          <Text className="text-white text-3xl font-bold leading-snug">
            남들이 딴짓할때{"\n"}우리는 서로를 가두고{"\n"}집중한다.
          </Text>
          
          <View className="mt-5 bg-white/10 self-start px-3 py-1.5 rounded-md">
            <Text className="text-white/70 text-xs font-medium">
              계약하고 집중하고 벌칙으로 완성한다
            </Text>
          </View>
        </View>

        {/* 하단 버튼 영역 */}
        <View className="gap-3">
          <Button
            title="방 코드로 입장하기"
            variant="secondary"
            onPress={handleOpenCodeDialog}
          />

          <Button
            title="방 만들기"
            variant="primary"
            onPress={() => router.push('/room/create')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}