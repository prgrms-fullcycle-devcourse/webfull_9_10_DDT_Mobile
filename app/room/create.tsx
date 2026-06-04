// app/room/create.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, X, Eye, EyeOff, Users, Lightbulb } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../../src/store/useAuthStore';
import { getRoomApi } from '../../src/api/generated/room-api/room-api';
import axiosClient from '../../src/api/axiosClient';

type Step = 'form' | 'complete';

export default function CreateRoom() {
  const router = useRouter();
  const me = useAuthStore((state) => state.me);
  const isGuest = me?.role === 'guest';

  const [step, setStep] = useState<Step>('form');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isValid = roomName.trim().length > 0 && password.length >= 4 && password.length <= 12;

  // 방 생성 API Mutation
  const createRoomMutation = useMutation({
    mutationFn: async (input: { title: string; password: string }) => {
      const res = await getRoomApi(axiosClient).roomControllerCreate(input);
      return res.data as { code: string; url: string };
    },
    onSuccess: async (data) => {
      setRoomCode(data.code);
      // 모바일 환경에 맞게 SecureStore에 방장 인증 정보 임시 저장
      await SecureStore.setItemAsync(`isHost:${data.code}`, 'true');
      await SecureStore.setItemAsync(`hostPassword:${data.code}`, password);
      setStep('complete');
    },
    onError: (err: any) => {
      const serverMessage = err.response?.data?.message;
      Alert.alert('방 생성 실패', serverMessage ?? '오류가 발생했습니다.');
    },
  });

  const handleSubmit = () => {
    if (!isValid) return;
    createRoomMutation.mutate({ title: roomName, password });
  };

  const handleCopyAll = async () => {
    // 앱에서는 웹 주소 대신 딥링크나 다운로드 링크 등을 쓸 수 있지만, 임시로 웹과 통일
    const inviteLink = `https://ddt-app.com/room/${roomCode}`;
    const text = `[${roomName}] 에 초대합니다\n비밀번호 : ${password}\n방 코드 : ${roomCode}\n입장 링크 : ${inviteLink}`;
    await Clipboard.setStringAsync(text);
    Alert.alert('복사 완료', '초대 정보가 클립보드에 복사되었어요!');
  };

  // 게스트 유저 접근 차단 화면
  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816]">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">방 만들기</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-base font-bold mb-2">방을 만들려면 로그인이 필요해요.</Text>
          <Text className="text-white/50 text-sm text-center mb-6 leading-relaxed">
            게스트는 방을 만들 수 없어요.{"\n"}회원으로 로그인 후 이용해주세요.
          </Text>
          <Pressable
            onPress={() => router.replace('/terms')}
            className="w-full bg-white py-4 rounded-2xl items-center"
          >
            <Text className="text-black font-bold text-base">로그인하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          {step === 'complete' ? (
            <Pressable onPress={() => router.back()} className="p-2">
              <X color="white" size={24} />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} className="p-2">
              <ChevronLeft color="white" size={28} />
            </Pressable>
          )}
          <Text className="text-white text-lg font-bold ml-2">
            {step === 'complete' ? '방 생성 완료 🎉' : '방 만들기'}
          </Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-4">
        {step === 'form' ? (
          <>
            {/* 방 생성 폼 */}
            <Text className="text-center text-xl text-white/70 leading-relaxed mb-6">
              비밀방을 생성해{"\n"}같이 집중할 멤버를 초대하세요.
            </Text>

            <View className="bg-[#111827] border border-white/10 rounded-2xl flex-row items-center justify-center py-3 mb-8">
              <Users color="#6B7280" size={18} />
              <Text className="text-[#9CA3AF] text-sm ml-2">최대 10명까지 입장 가능합니다.</Text>
            </View>

            <View className="gap-6">
              {/* 방 이름 입력 */}
              <View className="gap-2">
                <Text className="text-white/85 font-bold text-[15px]">방 이름</Text>
                <TextInput
                  className="bg-[#1A1A2E] text-white px-4 h-14 rounded-2xl border border-white/10"
                  placeholder="방 이름을 입력해주세요"
                  placeholderTextColor="#6B7280"
                  maxLength={20}
                  value={roomName}
                  onChangeText={setRoomName}
                />
                <Text className="text-[#6B7280] text-xs text-right">{roomName.length}/20</Text>
              </View>

              {/* 비밀번호 입력 */}
              <View className="gap-2">
                <Text className="text-white/85 font-bold text-[15px]">비밀번호</Text>
                <View className="relative justify-center">
                  <TextInput
                    className="bg-[#1A1A2E] text-white px-4 pr-12 h-14 rounded-2xl border border-white/10"
                    placeholder="비밀번호를 입력해주세요"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    maxLength={12}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable
                    className="absolute right-4"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff color="#6B7280" size={20} /> : <Eye color="#6B7280" size={20} />}
                  </Pressable>
                </View>
                <Text className="text-[#6B7280] text-xs ml-1">· 비밀번호는 4~12자이어야 합니다.</Text>
              </View>
            </View>

            <View className="flex-1" />

            {/* 만들기 버튼 */}
            <Pressable
              disabled={!isValid || createRoomMutation.isPending}
              onPress={handleSubmit}
              className={`w-full py-4 rounded-2xl items-center mb-4 ${
                isValid && !createRoomMutation.isPending ? 'bg-[#7c3aed]' : 'bg-[#1F2937]'
              }`}
            >
              {createRoomMutation.isPending ? (
                <ActivityIndicator color="#9CA3AF" />
              ) : (
                <Text className={`font-bold text-base ${isValid ? 'text-white' : 'text-[#9CA3AF]'}`}>
                  방 만들기
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* 완료 화면 */}
            <Text className="text-center text-base text-white/70 mb-6">
              방이 성공적으로 생성되었어요!
            </Text>

            <View className="bg-[#111827] border border-white/10 rounded-[16px] px-4 py-5 gap-4">
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-xs text-[#6B7280] mb-1">방 이름</Text>
                  <Text className="text-sm font-semibold text-white">{roomName}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-[#6B7280] mb-1">최대 인원</Text>
                  <Text className="text-sm font-semibold text-white">10명</Text>
                </View>
              </View>

              <View className="border-t border-white/10" />

              <View>
                <Text className="text-xs text-[#6B7280] mb-1">비밀번호</Text>
                <Text className="text-sm font-semibold text-white">{password}</Text>
              </View>

              <View className="border-t border-white/10" />

              <View>
                <Text className="text-xs text-[#6B7280] mb-1">방 코드</Text>
                <Text className="text-2xl font-bold text-[#7c3aed] tracking-widest">{roomCode}</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2 mt-4 bg-white/5 p-3 rounded-lg">
              <Lightbulb color="#FACC15" size={16} className="mt-0.5" />
              <Text className="text-xs text-[#9CA3AF] leading-relaxed flex-1">
                링크와 비밀번호를 공유하여 같이 집중할 멤버들과 함께 입장해 시작해보세요!
              </Text>
            </View>

            <Pressable
              onPress={handleCopyAll}
              className="mt-6 w-full py-4 rounded-xl border border-[#8B5CF6] items-center"
            >
              <Text className="text-white/90 text-sm font-bold">초대 정보 모두 복사</Text>
            </Pressable>

            <View className="flex-1" />

            <Pressable
              onPress={() => router.push(`/room/${roomCode}`)}
              className="w-full bg-white py-4 rounded-2xl items-center mb-4"
            >
              <Text className="text-black font-bold text-base">입장하기</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}