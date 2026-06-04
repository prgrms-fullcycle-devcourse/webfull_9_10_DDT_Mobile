import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../../../src/store/useAuthStore';
import { getRoomApi } from '../../../src/api/generated/room-api/room-api';
import axiosClient from '../../../src/api/axiosClient';

import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

const PROFILE_OPTIONS = [
  { key: 'basic_image_key_01', src: require('../../../assets/images/avatars/bear.png') },
  { key: 'basic_image_key_02', src: require('../../../assets/images/avatars/cat.png') },
  { key: 'basic_image_key_03', src: require('../../../assets/images/avatars/crocodile.png') },
  { key: 'basic_image_key_04', src: require('../../../assets/images/avatars/fox.png') },
  { key: 'basic_image_key_05', src: require('../../../assets/images/avatars/hedgehog.png') },
  { key: 'basic_image_key_06', src: require('../../../assets/images/avatars/monkey.png') },
  { key: 'basic_image_key_07', src: require('../../../assets/images/avatars/penguin.png') },
  { key: 'basic_image_key_08', src: require('../../../assets/images/avatars/pig.png') },
  { key: 'basic_image_key_09', src: require('../../../assets/images/avatars/rabbit.png') },
  { key: 'basic_image_key_10', src: require('../../../assets/images/avatars/shiba.png') },
];

export default function JoinRoom() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const me = useAuthStore((state) => state.me);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    fetchMe();
    SecureStore.getItemAsync(`isHost:${code}`).then((val) => {
      setIsHost(val === 'true');
    });
  }, [code]);

  useEffect(() => {
    if (isLoggedIn && me?.role === 'user' && !nickname) {
      setNickname(me.nickname);
      const optionIndex = PROFILE_OPTIONS.findIndex((opt) => opt.key === me.profileImage);
      if (optionIndex !== -1) setSelectedProfile(optionIndex);
    }
  }, [isLoggedIn, me]);

  const isValid = nickname.trim().length > 0 && (isHost || (password.length >= 4 && password.length <= 20));

  const { isLoading: isRoomLoading, isError: isRoomInvalid } = useQuery({
    queryKey: ['room', code],
    queryFn: async () => {
      const res = await getRoomApi(axiosClient).roomControllerFindById(code!);
      return res.data;
    },
    enabled: !!code,
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: async (input: { password: string; nickname: string; profileImage: string }) => {
      const res = await getRoomApi(axiosClient).roomControllerJoinById(code!, input);
      return res.data as { id: string; isReturning: boolean };
    },
    onSuccess: () => {
      router.push(`/room/${code}/contract`);
    },
    onError: (err: any) => {
      const serverMessage = err.response?.data?.message;
      Alert.alert('입장 실패', serverMessage ?? '오류가 발생했습니다.');
    },
  });

  const handleSubmit = async () => {
    if (!isValid) return;

    let submitPassword = password;
    if (isHost) {
      const savedPw = await SecureStore.getItemAsync(`hostPassword:${code}`);
      submitPassword = savedPw ?? '';
    }

    joinMutation.mutate({
      password: submitPassword,
      nickname,
      profileImage: PROFILE_OPTIONS[selectedProfile].key,
    });
  };

  if (isRoomLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816] items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text className="text-white/50 mt-4">방 정보를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (isRoomInvalid) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816]">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.replace('/')} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">방 입장하기</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-base font-bold mb-2">존재하지 않거나 종료된 방이에요.</Text>
          <Text className="text-white/50 text-sm mb-6">방 코드를 다시 확인해주세요.</Text>
          <Button
            title="홈으로"
            variant="primary"
            onPress={() => router.replace('/')}
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="p-2">
          <ChevronLeft color="white" size={28} />
        </Pressable>
        <Text className="text-white text-lg font-bold ml-2">방 입장하기</Text>
      </View>

      <View className="flex-1 px-6 pt-4 gap-6">
        <Input
          label="내 닉네임"
          placeholder="방에서 사용할 닉네임을 입력해주세요"
          maxLength={10}
          maxLengthIndicator
          value={nickname}
          onChangeText={setNickname}
        />

        <View className="gap-3">
          <Text className="text-white/85 font-bold text-[15px]">프로필 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible pb-2">
            <View className="flex-row gap-3 pr-4">
              {PROFILE_OPTIONS.map((opt, index) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelectedProfile(index)}
                  className={`w-16 h-16 rounded-full items-center justify-center bg-[#1A1A2E] border-2 ${
                    selectedProfile === index ? 'border-[#8B5CF6]' : 'border-transparent'
                  }`}
                >
                  <Image source={opt.src} className="w-14 h-14 rounded-full" resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {!isHost && (
          <View>
            <Input
              label="방 비밀번호"
              placeholder="비밀번호를 입력해주세요"
              isPassword
              maxLength={12}
              value={password}
              onChangeText={setPassword}
            />
            <Text className="text-[#6B7280] text-xs ml-1 mt-1">· 비밀번호는 4~12자이어야 합니다.</Text>
          </View>
        )}

        <View className="flex-1" />

        <Button
          title="입장하기"
          disabled={!isValid}
          isLoading={joinMutation.isPending}
          onPress={handleSubmit}
          className="mb-4"
        />
      </View>
    </SafeAreaView>
  );
}