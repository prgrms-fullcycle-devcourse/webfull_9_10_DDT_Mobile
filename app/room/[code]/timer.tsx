// app/room/[code]/timer.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, Dimensions, AppState, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';

import { useSocket } from '../../../src/contexts/SocketContext';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useRoomStore } from '../../../src/store/useRoomStore';
import { TimerProgressBar } from '../../../src/components/timer/TimerProgressBar';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
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

  const appState = useRef(AppState.currentState);
  const breakNotificationId = useRef<string | null>(null);

  // 💡 안드로이드 하드웨어 뒤로가기 방어 및 모달 오픈
  usePreventBack(() => {
    setIsModalOpen(true);
  });

  // 1️⃣ 소켓 타이머 틱 연동
  useEffect(() => {
    if (!socket) return;
    const handleTick = (data: TimerTick) => setTimer(data);
    socket.on('timer:tick', handleTick);
    return () => { socket.off('timer:tick', handleTick); };
  }, [socket]);

  // 2️⃣ 결과 화면 전환
  useEffect(() => {
    if (phase === 'result') router.replace(`/room/${code}/semi-result`);
  }, [phase, code, router]);

  // 3️⃣ 플랫폼별 푸시 토큰 설정 (안드로이드 FCM 연동 / iOS 로컬 알림 우회)
  useEffect(() => {
    async function subscribeToPush() {
      try {
        if (Platform.OS === 'android') {
          const deviceToken = await getDevicePushTokenAsync();
          if (!deviceToken) return;

          console.log('발급된 Android FCM Token:', deviceToken);
          await axiosClient.post(`/rooms/${code}/push-subscription`, {
            token: deviceToken,
            platform: 'android', 
          });
        } else if (Platform.OS === 'ios') {
          // iOS는 서버 푸시 대신 로컬 알림을 사용할 것임을 백엔드에 알림
          await axiosClient.post(`/rooms/${code}/push-subscription`, {
            token: 'local_only',
            platform: 'ios',
          });
        }
      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
      }
    }
    subscribeToPush();
  }, [code]);

  // 4️⃣ iOS 전용: 휴식 종료 1분 전 로컬 알림 예약
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let isCancelled = false;

    const scheduleBreakWarning = async () => {
      if (timer.mode === 'BREAK' && timer.timeLeft > 60) {
        const triggerSeconds = timer.timeLeft - 60; // 1분 전 시간 계산
        
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "휴식이 1분 남았어요! ⏰",
            body: "곧 집중 시간이 시작됩니다. 자리에 앉아주세요!",
            sound: true,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
            seconds: triggerSeconds,
          },
        });

        if (isCancelled) {
          await Notifications.cancelScheduledNotificationAsync(id);
        } else {
          breakNotificationId.current = id;
        }
      }
    };

    scheduleBreakWarning();

    return () => {
      isCancelled = true;
      if (breakNotificationId.current) {
        Notifications.cancelScheduledNotificationAsync(breakNotificationId.current).catch(() => {});
        breakNotificationId.current = null;
      }
    };
  }, [timer.mode, timer.currentSession]); // 페이즈가 변경될 때마다 1회만 예약 실행

  // 5️⃣ 앱 이탈(백그라운드 진입) 감지 및 iOS 로컬 경고 알림
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // 앱이 액티브 상태에서 백그라운드나 인액티브로 넘어갈 때
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (timer.mode === 'FOCUS') {
          // 서버에 이탈 시작을 알림
          socket?.emit('escape:start');

          // iOS의 경우 백그라운드 진입 시 즉시 로컬 경고 알림 발생
          if (Platform.OS === 'ios') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🚨 이탈 감지!",
                body: "화면을 벗어났습니다! 벌칙 시간이 누적되고 있으니 어서 돌아오세요.",
                sound: true,
              },
              trigger: null, // 즉시 발송
            });
          }
        } else {
          // 휴식 모드일 때 나가는 것은 이탈로 치지 않음
          socket?.emit('escape:end');
        }
      } 
      // 앱으로 다시 돌아왔을 때
      else if (nextAppState === 'active') {
        socket?.emit('escape:end');
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [timer.mode, socket]);

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
      {/* 🔹 상단 정보 */}
      <View className="w-full px-6 pt-4 pb-2 items-center">
        <Text className={`text-lg font-bold ${isFocus ? 'text-[#A855F7]' : 'text-[#22C55E]'}`}>
          {isFocus ? '집중 시간' : '휴식 시간'} {timer.currentSession} / {timer.totalSessions}
        </Text>
      </View>

      {/* 🔹 진행 바 */}
      <TimerProgressBar 
        mode={timer.mode}
        currentSession={timer.currentSession}
        totalSessions={timer.totalSessions}
        timeLeft={timer.timeLeft}
        totalDuration={totalDuration}
        focusDuration={timer.focusDuration}
        breakDuration={timer.breakDuration}
      />

      {/* 🔹 중앙 타이머 원 */}
      <View className="flex-1 items-center justify-center">
        <View className="relative items-center justify-center">
          <Svg width={width * 0.8} height={width * 0.8} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={width * 0.4}
              cy={width * 0.4}
              r={radius}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="12"
              fill="transparent"
            />
            <Circle
              cx={width * 0.4}
              cy={width * 0.4}
              r={radius}
              stroke={isFocus ? '#7c3aed' : '#22C55E'}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          
          <View className="absolute items-center justify-center">
            <Text className="text-[#94A3B8] text-sm mb-1">{isFocus ? '집중 중' : '휴식 중'}</Text>
            <Text className="text-white text-6xl font-bold tracking-wider font-mono">
              {formatTime(displayTime)}
            </Text>
          </View>
        </View>
      </View>

      {/* 🔹 하단 버튼 */}
      <View className="w-full px-6">
        <Button 
          title="중도 포기" 
          variant="outline" 
          onPress={() => setIsModalOpen(true)} 
        />
      </View>

      {/* 🔹 중도 포기 모달 */}
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