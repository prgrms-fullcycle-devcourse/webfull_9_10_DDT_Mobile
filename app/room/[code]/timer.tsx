// app/room/[code]/timer.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Modal, AppState, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { useSocket } from '../../../src/contexts/SocketContext';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useRoomStore } from '../../../src/store/useRoomStore';
import { TimerProgressBar } from '../../../src/components/timer/TimerProgressBar';
import { TimerCircle } from '../../../src/components/timer/TimerCircle';
import { usePreventBack } from '../../../src/hooks/usePreventBack';
import { getDevicePushTokenAsync } from '../../../src/lib/notifications';
import { getTimerApi } from '../../../src/api/generated/timer-api-타이머-및-세션-제어/timer-api-타이머-및-세션-제어';
import { getRoomApi } from '../../../src/api/generated/room-api/room-api';
import axiosClient from '../../../src/api/axiosClient';
import { Button } from '../../../src/components/ui/Button';

export default function TimerScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const socket = useSocket();
  
  const phase = useRoomStore((s) => s.phase);
  const me = useAuthStore((s) => s.me);
  const sessionInfo = useRoomStore((s) => s.sessionInfo);
  const members = useRoomStore((s) => s.members);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const appState = useRef(AppState.currentState);
  const isFocusRef = useRef(true);
  const lastEscapeStartRef = useRef<number>(0);

  // 1️⃣ 로컬 시간 계산 (1초마다 렌더링)
  useEffect(() => {
    if (!sessionInfo) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo]);

  // 2️⃣ 중도 포기 확인 및 결과화면 이동 처리
  useEffect(() => {
    const myMember = me ? members[me.id] : undefined;
    if (myMember?.gaveUpAt) {
      router.replace(`/room/${code}/roulette?from=giveup`);
    }
  }, [me, members, code, router]);

  useEffect(() => {
    if (phase === 'contract') {
      router.replace(`/room/${code}/contract`);
    } else if (phase === 'result') {
      router.replace(`/room/${code}/semi-result`);
    }
  }, [phase, code, router]);

  // 3️⃣ 소켓 하트비트
  useEffect(() => {
    if (!socket || !sessionInfo) return;
    const interval = setInterval(() => {
      socket.emit('heartbeat');
    }, 5000);
    return () => clearInterval(interval);
  }, [socket, sessionInfo]);

  // 💡 앱 이탈(백그라운드) 로직
  const emitEscapeStart = useCallback(() => {
    const time = Date.now();
    if (time - lastEscapeStartRef.current < 300) return;
    lastEscapeStartRef.current = time;
    socket?.emit('escape:start');
    
    // 모바일 특성상 백그라운드에서는 Toast가 안 보이므로
    // RN에서는 푸시 알림(Local/Remote)으로 경고를 확인합니다.
  }, [socket]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (isFocusRef.current) {
          emitEscapeStart();
          
          if (Platform.OS === 'ios') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🚨 이탈 감지!",
                body: "화면을 벗어났습니다! 벌칙 시간이 누적되고 있으니 어서 돌아오세요.",
                sound: true,
              },
              trigger: null,
            });
          }
        } else {
          socket?.emit('escape:end');
        }
      } else if (nextAppState === 'active') {
        socket?.emit('escape:end');
        
        // 다시 포그라운드로 왔을 때 방 상태가 끝났는지 체크
        try {
          const res = await getRoomApi(axiosClient).roomControllerFindById(code!);
          const data = res.data as any;
          if (data.phase === 'result' || data.phase === 'closed') {
            useRoomStore.setState({ phase: data.phase });
          }
        } catch (e) {}
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [emitEscapeStart, socket, code]);

  usePreventBack(() => setIsModalOpen(true));

  // 4️⃣ 중도포기 (Give Up) API
  const giveUpMutation = useMutation({
    mutationFn: async () => {
      const res = await getTimerApi(axiosClient).timerControllerGiveUp(code!);
      return res.data;
    },
    onSuccess: () => {
      setIsModalOpen(false);
      Alert.alert('포기 완료', '중도 포기 처리되었습니다.');
      router.replace(`/room/${code}/roulette?from=giveup`);
    },
    onError: (error: any) => {
      Alert.alert('오류', error.response?.data?.message || '처리에 실패했습니다.');
    },
  });

  if (!me || !sessionInfo) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816] items-center justify-center">
        <Text className="text-white">로딩 중...</Text>
      </SafeAreaView>
    );
  }

  // ⏱ 시간 계산 로직 (웹과 100% 동일)
  const adjustedNow = now + (sessionInfo.serverOffset ?? 0);
  const elapsed = adjustedNow - sessionInfo.startedAt;
  const focusMs = sessionInfo.focusMin * 60 * 1000;
  const breakMs = sessionInfo.breakMin * 60 * 1000;
  const cycleMs = focusMs + breakMs;
  const totalRounds = sessionInfo.totalRounds;
  const totalMs = focusMs * totalRounds + breakMs * Math.max(0, totalRounds - 1);

  const clampedElapsed = Math.min(Math.max(0, elapsed), totalMs);
  const lastRoundStartMs = cycleMs * Math.max(0, totalRounds - 1);
  const isLastRound = cycleMs > 0 ? clampedElapsed >= lastRoundStartMs : true;

  const round = isLastRound ? totalRounds : Math.floor(clampedElapsed / cycleMs) + 1;
  const cycleElapsed = isLastRound ? clampedElapsed - lastRoundStartMs : clampedElapsed % cycleMs;
  const isFocus = isLastRound || cycleElapsed < focusMs;
  isFocusRef.current = isFocus;

  const phaseRemainingMs = isFocus ? focusMs - cycleElapsed : cycleMs - cycleElapsed;
  const phaseTotalMs = isFocus ? focusMs : breakMs;

  const phaseRemainingSec = Math.max(0, Math.ceil(phaseRemainingMs / 1000));
  const phaseTotalSec = Math.ceil(phaseTotalMs / 1000);
  
  // 페이즈 종료 0초 도달 시 폴링
  if (phaseRemainingSec === 0) {
    getRoomApi(axiosClient).roomControllerFindById(code!).then(res => {
      const data = res.data as any;
      if (data.phase === 'result' || data.phase === 'closed') {
        useRoomStore.setState({ phase: data.phase });
      }
    }).catch(()=>{});
  }

  const focusDurationSec = sessionInfo.focusMin * 60;
  const breakDurationSec = sessionInfo.breakMin * 60;

  const theme = {
    textColor: isFocus ? 'text-[#A855F7]' : 'text-[#22C55E]',
    strokeColor: isFocus ? '#7c3aed' : '#22C55E',
    statusText: isFocus ? '집중 시간' : '휴식 시간',
    subStatusText: isFocus ? '집중 중' : '휴식 중',
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050816] items-center justify-between pb-8">
      {/* 🔹 상단 정보 */}
      <View className="w-full px-6 pt-4 pb-2 items-center">
        <Text className={`text-lg font-bold ${theme.textColor}`}>
          {theme.statusText} {round} / {totalRounds}
        </Text>
      </View>

      {/* 🔹 진행 바 */}
      <TimerProgressBar 
        mode={isFocus ? 'FOCUS' : 'BREAK'}
        currentSession={round}
        totalSessions={totalRounds}
        timeLeft={phaseRemainingSec}
        totalDuration={phaseTotalSec}
        focusDuration={focusDurationSec}
        breakDuration={breakDurationSec}
      />

      {/* 🔹 중앙 타이머 원 */}
      <View className="flex-1 items-center justify-center">
        <TimerCircle
          timeLeft={phaseRemainingSec}
          totalDuration={phaseTotalSec}
          strokeColor={theme.strokeColor}
          subStatusText={theme.subStatusText}
        />

        {!isFocus && (
          <View className="mt-10 bg-white/10 px-4 py-3 rounded-xl border border-white/20">
            <Text className="text-white/80 text-sm">⚠️ 시작 1분 전에 알림이 울립니다.</Text>
          </View>
        )}
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
            <Text className="text-white text-lg font-bold mb-2">
              포기하면 남은 시간이{"\n"}모두 이탈 시간으로 처리돼요.
            </Text>
            <Text className="text-white/50 text-sm mb-8">가장 많은 벌칙을 받게 됩니다.</Text>
            <View className="flex-row gap-3">
              <Button 
                title="포기하기" 
                variant="destructive" 
                className="flex-1" 
                isLoading={giveUpMutation.isPending}
                disabled={giveUpMutation.isPending}
                onPress={() => giveUpMutation.mutate()} 
              />
              <Button 
                title="취소" 
                variant="secondary" 
                className="flex-1" 
                disabled={giveUpMutation.isPending}
                onPress={() => setIsModalOpen(false)} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}