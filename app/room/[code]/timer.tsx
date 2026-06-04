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
      <View className="w-full py-4 items-center">
        <Text className={`text-xl font-bold ${isFocus ? 'text-[#7c3aed]' : 'text-[#10b981]'}`}>
          {isFocus ? '집중 시간' : '휴식 시간'} {timer.currentSession}/{timer.totalSessions}
        </Text>
      </View>

      <View className="items-center w-full flex-1 pt-6">
        <TimerProgressBar 
          mode={timer.mode}
          currentSession={timer.currentSession}
          totalSessions={timer.totalSessions}
          timeLeft={timer.timeLeft}
          totalDuration={totalDuration}
          focusDuration={timer.focusDuration}
          breakDuration={timer.breakDuration}
        />

        <View className="relative items-center justify-center -rotate-90 mt-10">
          <Svg width={radius * 2 + 40} height={radius * 2 + 40}>
            <Circle cx={radius + 20} cy={radius + 20} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="12" fill="none" />
            <Circle 
              cx={radius + 20} cy={radius + 20} r={radius} 
              stroke={isFocus ? "#7c3aed" : "#10b981"} strokeWidth="12" fill="none"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            />
          </Svg>
          <View className="absolute rotate-90 items-center">
            <Text className="text-[#94A3B8] text-sm mb-1">{isFocus ? '집중 중' : '휴식 중'}</Text>
            <Text className="text-white text-6xl font-bold tracking-widest">{formatTime(displayTime)}</Text>
          </View>
        </View>
      </View>

      <View className="w-full px-6">
        <Pressable onPress={() => setIsModalOpen(true)} className="w-full py-4 bg-transparent border border-white/20 rounded-2xl items-center">
          <Text className="text-white/60 font-bold text-base">중도 포기</Text>
        </Pressable>
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-[#1E2538] w-full rounded-3xl p-6">
            <Text className="text-white text-lg font-bold mb-2">포기하면 남은 시간이{"\n"}모두 이탈 시간으로 처리돼요.</Text>
            <Text className="text-white/50 text-sm mb-8">가장 많은 벌칙을 받게 됩니다.</Text>
            <View className="flex-row gap-3">
              <Pressable onPress={handleForfeit} className="flex-1 bg-[#F85A5A] py-4 rounded-xl items-center">
                <Text className="text-white font-bold text-base">포기하기</Text>
              </Pressable>
              <Pressable onPress={() => setIsModalOpen(false)} className="flex-1 bg-[#2A314A] py-4 rounded-xl items-center">
                <Text className="text-white font-bold text-base">취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}