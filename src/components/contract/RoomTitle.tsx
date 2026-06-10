import React from 'react';
import { View, Text } from 'react-native';

interface RoomTitleProps {
  title: string;
  code: string;
  isConnected: boolean;
}

export default function RoomTitle({ title, code, isConnected }: RoomTitleProps) {
  return (
    <View className="bg-[#111827] border border-white/10 rounded-2xl p-5 mb-4 mx-4 mt-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white text-xl font-bold flex-1 mr-2">{title}</Text>
        <View className={`px-2.5 py-1 rounded-full ${isConnected ? 'bg-primary' : 'bg-destructive'}`}>
          <Text className="text-white text-xs font-bold">
            {isConnected ? '실시간 연결됨' : '연결 시도 중...'}
          </Text>
        </View>
      </View>
      <Text className="text-white/50 text-xs mb-1">방 코드: {code}</Text>
      <Text className="text-white/80 text-sm leading-relaxed">
        함께 규칙을 정하고 서명하세요.
      </Text>
    </View>
  );
}