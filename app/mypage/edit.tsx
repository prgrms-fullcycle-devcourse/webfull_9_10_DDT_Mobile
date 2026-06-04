// app/mypage/edit.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
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

export default function MyPageEditScreen() {
  const router = useRouter();
  const { me, fetchMe } = useAuthStore();
  
  const initialProfileIdx = PROFILE_OPTIONS.findIndex(o => o.key === me?.profileImage);
  
  const [nickname, setNickname] = useState(me?.nickname || '');
  const [selectedProfile, setSelectedProfile] = useState(initialProfileIdx >= 0 ? initialProfileIdx : 0);
  const [isSaving, setIsSaving] = useState(false);

  const isValid = nickname.trim().length >= 2 && nickname.trim().length <= 10;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await getUsers(axiosClient).usersControllerUpdateMe({
        nickname: nickname.trim(),
        profileImage: PROFILE_OPTIONS[selectedProfile].key
      });
      await fetchMe();
      Alert.alert('성공', '프로필이 수정되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('오류', '프로필 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">프로필 수정</Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-6 gap-8">
        <View className="gap-2">
          <Text className="text-white/85 font-bold text-[15px]">내 닉네임</Text>
          <TextInput
            className="bg-[#1A1A2E] text-white px-4 h-14 rounded-2xl border border-white/10"
            placeholder="변경할 닉네임 (2~10자)"
            placeholderTextColor="#6B7280"
            maxLength={10}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View className="gap-3">
          <Text className="text-white/85 font-bold text-[15px]">프로필 이미지 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
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

        <View className="flex-1" />

        <Pressable
          disabled={!isValid || isSaving}
          onPress={handleSave}
          className={`w-full py-4 rounded-2xl items-center mb-4 ${isValid ? 'bg-[#7c3aed]' : 'bg-[#1F2937]'}`}
        >
          {isSaving ? <ActivityIndicator color="white" /> : <Text className={`font-bold text-base ${isValid ? 'text-white' : 'text-[#9CA3AF]'}`}>저장하기</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}