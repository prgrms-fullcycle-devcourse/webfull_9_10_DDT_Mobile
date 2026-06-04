import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, X, Users, Lightbulb } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../../src/store/useAuthStore';
import { getRoomApi } from '../../src/api/generated/room-api/room-api';
import axiosClient from '../../src/api/axiosClient';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

type Step = 'form' | 'complete';

function CreateRoomComplete({
  roomName,
  password,
  roomCode,
  inviteLink,
  onCopyAll,
}: {
  roomName: string;
  password: string;
  roomCode: string;
  inviteLink: string;
  onCopyAll: () => void;
}) {
  return (
    <View className='flex flex-col gap-5 pt-2'>
      <Text className='text-center text-base text-white/70 mb-6'>
        방이 성공적으로 생성되었어요!
      </Text>

      <View className='bg-[#111827] border border-white/10 rounded-[16px] px-4 py-5 gap-4'>
        <View className='flex-row justify-between'>
          <View className='flex-1'>
            <Text className='text-xs text-[#6B7280] mb-1'>방 이름</Text>
            <Text className='text-sm font-semibold text-white'>{roomName}</Text>
          </View>
          <View className='items-end'>
            <Text className='text-xs text-[#6B7280] mb-1'>최대 인원</Text>
            <Text className='text-sm font-semibold text-white'>10명</Text>
          </View>
        </View>

        <View className='border-t border-white/10' />

        <View>
          <Text className='text-xs text-[#6B7280] mb-1'>비밀번호</Text>
          <Text className='text-sm font-semibold text-white'>{password}</Text>
        </View>

        <View className='border-t border-white/10' />

        <View>
          <Text className='text-xs text-[#6B7280] mb-1'>방 코드</Text>
          <Text className='text-2xl font-bold text-[#7c3aed] tracking-widest'>
            {roomCode}
          </Text>
        </View>
      </View>

      <View className='flex-row items-start gap-2 mt-4 bg-white/5 p-3 rounded-lg'>
        <Lightbulb color="#FACC15" size={16} className="mt-0.5" />
        <Text className='text-xs text-[#9CA3AF] leading-relaxed flex-1'>
          링크와 비밀번호를 공유하여 같이 집중할 멤버들과 함께 입장해 시작해보세요!
        </Text>
      </View>

      <Button
        title="초대 정보 모두 복사"
        variant="outline"
        onPress={onCopyAll}
        className="mt-6 border-[#8B5CF6]"
      />
    </View>
  );
}

export default function CreateRoom() {
  const router = useRouter();
  const me = useAuthStore((state) => state.me);
  const isGuest = me?.role === 'guest';

  const [step, setStep] = useState<Step>('form');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const isValid = roomName.trim().length > 0 && password.length >= 4 && password.length <= 12;

  const createRoomMutation = useMutation({
    mutationFn: async (input: { title: string; password: string }) => {
      const res = await getRoomApi(axiosClient).roomControllerCreate(input);
      return res.data as { code: string; url: string };
    },
    onSuccess: async (data) => {
      setRoomCode(data.code);
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
    const inviteLink = `https://ddt-app.com/room/${roomCode}`;
    const text = `[${roomName}] 에 초대합니다\n비밀번호 : ${password}\n방 코드 : ${roomCode}\n입장 링크 : ${inviteLink}`;
    await Clipboard.setStringAsync(text);
    Alert.alert('복사 완료', '초대 정보가 클립보드에 복사되었어요!');
  };

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
          <Button
            title="로그인하기"
            variant="primary"
            onPress={() => router.replace('/terms')}
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
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
            <Text className="text-center text-xl text-white/70 leading-relaxed mb-6">
              비밀방을 생성해{"\n"}같이 집중할 멤버를 초대하세요.
            </Text>

            <View className="bg-[#111827] border border-white/10 rounded-2xl flex-row items-center justify-center py-3 mb-8">
              <Users color="#6B7280" size={18} />
              <Text className="text-[#9CA3AF] text-sm ml-2">최대 10명까지 입장 가능합니다.</Text>
            </View>

            <View className="gap-6">
              <Input
                label="방 이름"
                placeholder="방 이름을 입력해주세요"
                maxLength={20}
                maxLengthIndicator
                value={roomName}
                onChangeText={setRoomName}
              />

              <View>
                <Input
                  label="비밀번호"
                  placeholder="비밀번호를 입력해주세요"
                  isPassword
                  maxLength={12}
                  value={password}
                  onChangeText={setPassword}
                />
                <Text className="text-[#6B7280] text-xs ml-1 mt-1">· 비밀번호는 4~12자이어야 합니다.</Text>
              </View>
            </View>

            <View className="flex-1" />

            <Button
              title="방 만들기"
              disabled={!isValid}
              isLoading={createRoomMutation.isPending}
              onPress={handleSubmit}
              className="mb-4"
            />
          </>
        ) : (
          <>
            <CreateRoomComplete
              roomName={roomName}
              password={password}
              roomCode={roomCode}
              inviteLink={`https://ddt-app.com/room/${roomCode}`}
              onCopyAll={handleCopyAll}
            />

            <View className="flex-1" />

            <Button
              title="입장하기"
              variant="primary"
              onPress={() => router.push(`/room/${roomCode}`)}
              className="mb-4"
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}