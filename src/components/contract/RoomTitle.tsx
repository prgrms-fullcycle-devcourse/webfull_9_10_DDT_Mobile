import React from 'react';
import { View, Text } from 'react-native';

interface RoomTitleProps {
  title: string;
  code: string;
  isConnected: boolean;
}

/**
 * 대기방의 메인 최상단 카드 섹션으로, 방 고유 한글 타이틀 명칭, 난수 방 코드 식별자 및 실시간 웹소켓 서버 연동 핑 신호 상태를 모니터링 출력하는 컴포넌트입니다.
 * @param {RoomTitleProps} props - 가시화할 방 고유 명부 및 통신 싱크 상태 플래그
 * @returns {JSX.Element} 최상단 타이틀 안내 블록 UI
 */
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