// app/index.tsx
import React, { useState } from 'react';
import { View, Text, Modal, TextInput, ImageBackground, Image, Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { Button } from '../src/components/ui/Button';

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, me, logout } = useAuthStore();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  // 방 코드로 입장하기 로직
  const handleEnterRoom = () => {
    const code = roomCode.trim();
    if (code.length === 8) {
      setShowCodeModal(false);
      router.push(`/room/${code}`);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/mainBackground.webp')}
      className="flex-1 bg-[#050816]"
      resizeMode="cover"
    >
      {/* 배경 어둡게 눌러주는 오버레이 */}
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/60 z-0" />

      <SafeAreaView className="flex-1 z-10 px-6 pb-8">
        {/* 우측 상단 로그인 / 마이페이지 버튼 */}
        <View className="flex-row justify-end pt-4">
          {isLoggedIn && me?.role === 'user' ? (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={() => router.push('/mypage')}
            >
              <Text className="text-white/80 text-sm font-bold">마이페이지</Text>
            </Pressable>
          ) : isLoggedIn && me?.role === 'guest' ? (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={logout}
            >
              <Text className="text-white/80 text-sm font-bold">로그아웃</Text>
            </Pressable>
          ) : (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={() => router.push('/terms')}
            >
              <Text className="text-white/80 text-sm font-bold">로그인</Text>
            </Pressable>
          )}
        </View>

        {/* 메인 카피 & 로고 영역 */}
        <View className="flex-1 justify-center mt-8">
          <Image 
            source={require('../assets/images/logo.webp')} 
            style={{ width: 160, height: 80, resizeMode: 'contain', marginBottom: 24 }} 
          />
          <Text className="text-white text-[32px] font-bold leading-[44px]">
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
            onPress={() => setShowCodeModal(true)}
          />

          <Button
            title="방 만들기"
            variant="primary"
            onPress={() => router.push('/room/create')}
          />
        </View>
      </SafeAreaView>

      {/* 방 코드 입력 모달 */}
      <Modal visible={showCodeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-6">
          <View className="bg-[#1E2538] p-6 rounded-3xl gap-2">
            <Text className="text-white text-xl font-bold mb-1">방 코드로 입장</Text>
            <Text className="text-white/50 text-sm mb-4">초대받은 방 코드 8자리를 입력해주세요.</Text>
            
            <TextInput
              className="bg-[#111827] text-white px-5 h-14 rounded-2xl border border-white/10 tracking-widest text-center text-lg font-bold"
              placeholder="XXXXXXXX"
              placeholderTextColor="#6B7280"
              maxLength={8}
              autoCapitalize="characters"
              value={roomCode}
              onChangeText={(text) => setRoomCode(text.toUpperCase())}
            />
            
            <View className="flex-row gap-3 mt-6">
              <Button 
                title="취소" 
                variant="outline" 
                className="flex-1" 
                onPress={() => {
                  setShowCodeModal(false);
                  setRoomCode('');
                }} 
              />
              <Button 
                title="입장하기" 
                className="flex-1" 
                disabled={roomCode.length !== 8} 
                onPress={handleEnterRoom} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}