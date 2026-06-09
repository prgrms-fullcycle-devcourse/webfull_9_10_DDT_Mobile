import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useSocket } from '../../../src/contexts/SocketContext';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useRoomStore } from '../../../src/store/useRoomStore';
import { TimerProgressBar } from '../../../src/components/timer/TimerProgressBar';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
import { Platform } from 'react-native';
import { getDevicePushTokenAsync } from '../../../src/lib/notifications';
import axiosClient from '../../../src/api/axiosClient';
import { Button } from '../../../src/components/ui/Button';

const { width } = Dimensions.get('window');

type TimerMode = 'FOCUS' | 'BREAK';
interface TimerTick {
  timeLeft: number;
  mode: TimerMode;
  currentSession: number;
  totalSessions: number;
  focusDuration: number;
  breakDuration: number;
}

export default function TimerScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const socket = useSocket();
  const phase = useRoomStore((s) => s.phase);
  const me = useAuthStore((s) => s.me);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timer, setTimer] = useState<TimerTick>({
    timeLeft: 0, mode: 'FOCUS', currentSession: 1, totalSessions: 1, focusDuration: 0, breakDuration: 0,
  });

  // 💡 안드로이드 하드웨어 뒤로가기 방어 및 모달 오픈
  usePreventBack(() => {
    setIsModalOpen(true);
  });

  useEffect(() => {
    if (!socket) return;
    const handleTick = (data: TimerTick) => setTimer(data);
    socket.on('timer:tick', handleTick);
    return () => { socket.off('timer:tick', handleTick); };
  }, [socket]);

  useEffect(() => {
    if (phase === 'result') router.replace(`/room/${code}/semi-result`);
  }, [phase, code, router]);

  useEffect(() => {
    async function subscribeToPush() {
      try {
        const deviceToken = await getDevicePushTokenAsync();
        if (!deviceToken) return;

        console.log('발급된 Device Token:', deviceToken);
        console.log('현재 OS:', Platform.OS); // 'ios' | 'android'

        // 백엔드로 토큰과 플랫폼 정보 전송
        // (주의: 백엔드 API도 { token, platform }을 받도록 추후 수정해야 합니다)
        await axiosClient.post(`/rooms/${code}/push-subscription`, {
          token: deviceToken,
          platform: Platform.OS, 
        });

      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
      }
    }
    
    subscribeToPush();
  }, [code]);

  const handleForfeit = () => {
    socket?.emit('member:giveup');
    setIsModalOpen(false);
  };

  const isFocus = timer.mode === 'FOCUS';
  const totalDuration = isFocus ? timer.focusDuration : timer.breakDuration;
  const displayTime = Math.max(0, timer.timeLeft);
  
  const radius = width * 0.35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalDuration > 0 
    ? circumference - ((totalDuration - displayTime) / totalDuration) * circumference 
    : circumference;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!me) return null;

  return (
    <SafeAreaView className="flex-1 bg-[#050816] items-center justify-between pb-8">
      {/* ... 상단 및 중앙 프로그레스 부분 유지 ... */}

      <View className="w-full px-6">
        <Button 
          title="중도 포기" 
          variant="outline" 
          onPress={() => setIsModalOpen(true)} 
        />
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-[#1E2538] w-full rounded-3xl p-6">
            <Text className="text-white text-lg font-bold mb-2">포기하면 남은 시간이{"\n"}모두 이탈 시간으로 처리돼요.</Text>
            <Text className="text-white/50 text-sm mb-8">가장 많은 벌칙을 받게 됩니다.</Text>
            <View className="flex-row gap-3">
              <Button 
                title="포기하기" 
                variant="destructive" 
                className="flex-1" 
                onPress={handleForfeit} 
              />
              <Button 
                title="취소" 
                variant="secondary" 
                className="flex-1" 
                onPress={() => setIsModalOpen(false)} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}