import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Modal, AppState, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device'; 
import { useKeepAwake } from 'expo-keep-awake';
import Toast from 'react-native-toast-message';

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

const formatEscapeTime = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}분 ${s.toString().padStart(2, '0')}초`;
};

export default function TimerScreen() {
  useKeepAwake(); // 화면 꺼짐 방지

  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const socket = useSocket();
  
  const phase = useRoomStore((s) => s.phase);
  const me = useAuthStore((s) => s.me);
  const sessionInfo = useRoomStore((s) => s.sessionInfo);
  const members = useRoomStore((s) => s.members);
  const escapeSummary = useRoomStore((s) => s.escapeSummary); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const appState = useRef(AppState.currentState);
  const isFocusRef = useRef(true);
  const lastEscapeStartRef = useRef<number>(0);

  useEffect(() => {
    const registerPushToken = async () => {
      if (Platform.OS === 'android' && Device.isDevice) {
        const token = await getDevicePushTokenAsync();
        if (token) {
          try {
            await axiosClient.post(`/rooms/${code}/push-subscription`, { platform: 'android', token });
          } catch (e) {}
        }
      } else {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          try {
            await axiosClient.post(`/rooms/${code}/push-subscription`, { platform: 'ios', token: 'local_only' });
          } catch (e) {}
        }
      }
    };
    registerPushToken();
  }, [code]);
  
  useEffect(() => {
    if (!sessionInfo) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sessionInfo]);

  useEffect(() => {
    const myMember = me ? members[me.id] : undefined;
    if (myMember?.gaveUpAt) {
      Toast.show({ type: 'error', text1: '이미 탈옥한 방이에요.' });
      router.replace(`/room/${code}/roulette?from=giveup`);
    }
  }, [me, members, code, router]);

  useEffect(() => {
    if (phase === 'contract') router.replace(`/room/${code}/contract`);
    else if (phase === 'result') router.replace(`/room/${code}/semi-result`);
  }, [phase, code, router]);

  useEffect(() => {
    if (!socket || !sessionInfo) return;
    const interval = setInterval(() => socket.emit('heartbeat'), 5000);
    return () => clearInterval(interval);
  }, [socket, sessionInfo]);

  const emitEscapeStart = useCallback(() => {
    const time = Date.now();
    if (time - lastEscapeStartRef.current < 300) return;
    lastEscapeStartRef.current = time;
    socket?.emit('escape:start');
    Toast.show({ type: 'error', text1: '방을 이탈했어요!', text2: '이탈 시간이 누적돼요.', position: 'top' });
  }, [socket]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (isFocusRef.current) {
          emitEscapeStart();
          
          if (Platform.OS === 'ios' || !Device.isDevice) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "🚨 이탈 감지!", body: "화면을 벗어났습니다! 벌칙 시간이 누적되고 있으니 어서 돌아오세요.", sound: true },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
            });
          }
        } else {
          socket?.emit('escape:end');
        }
      } else if (nextAppState === 'active') {
        socket?.emit('escape:end');
        try {
          const res = await getRoomApi(axiosClient).roomControllerFindById(code!);
          const data = res.data as any;
          if (data.phase === 'result' || data.phase === 'closed') useRoomStore.setState({ phase: data.phase });
        } catch (e) {}
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [emitEscapeStart, socket, code]);

  usePreventBack(() => setIsModalOpen(true));

  const giveUpMutation = useMutation({
    mutationFn: async () => (await getTimerApi(axiosClient).timerControllerGiveUp(code!)).data,
    onSuccess: () => {
      setIsModalOpen(false);
      Toast.show({ type: 'error', text1: '탈옥 완료', text2: '수감 중 탈옥했습니다.' });
      router.replace(`/room/${code}/roulette?from=giveup`);
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: '오류', text2: error.response?.data?.message || '처리에 실패했습니다.' });
    }
  });

  const focusMin = sessionInfo?.focusMin ?? 0;
  const breakMin = sessionInfo?.breakMin ?? 0;
  const serverOffset = sessionInfo?.serverOffset ?? 0;
  const startedAt = sessionInfo?.startedAt ?? 0;
  const totalRounds = sessionInfo?.totalRounds ?? 1;

  const adjustedNow = now + serverOffset;
  const elapsed = adjustedNow - startedAt;
  const focusMs = focusMin * 60 * 1000;
  const breakMs = breakMin * 60 * 1000;
  const cycleMs = focusMs + breakMs;
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
  
  if (sessionInfo && phaseRemainingSec === 0) {
    getRoomApi(axiosClient).roomControllerFindById(code!).then(res => {
      const data = res.data as any;
      if (data.phase === 'result' || data.phase === 'closed') useRoomStore.setState({ phase: data.phase });
    }).catch(()=>{});
  }

  useEffect(() => {
    let notifId: string | null = null;
    if (sessionInfo && !isFocus && (breakMin * 60) >= 60) {
      if (Platform.OS === 'ios' || !Device.isDevice) {
        Notifications.scheduleNotificationAsync({
          content: { title: "휴식이 1분 남았어요! ⏰", body: "곧 집중 시간이 시작됩니다. 자리에 앉아주세요!", sound: true },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
            seconds: Math.max(1, (breakMin * 60) - 60) 
          }
        }).then(id => notifId = id);
      }
    }
    return () => {
      if (notifId) Notifications.cancelScheduledNotificationAsync(notifId).catch(()=>{});
    };
  }, [isFocus, round, breakMin, sessionInfo]);

  if (!me || !sessionInfo) {
    return (
      <SafeAreaView className="flex-1 bg-[#050816] items-center justify-center">
        <Text className="text-white">수감 준비 중...</Text>
      </SafeAreaView>
    );
  }

  const focusDurationSec = sessionInfo.focusMin * 60;
  const breakDurationSec = sessionInfo.breakMin * 60;

  const theme = {
    textColor: isFocus ? 'text-[#A855F7]' : 'text-[#22C55E]',
    strokeColor: isFocus ? '#7c3aed' : '#22C55E',
    statusText: isFocus ? '집중 시간' : '휴식 시간',
    subStatusText: isFocus ? '집중 중' : '휴식 중',
  };

  const myIdentifier = me.role === 'user' ? me.id : me.id; 
  const myEscapeMs = escapeSummary.find(e => e.identifier === myIdentifier)?.totalEscapeMs || 0;

  return (
    <SafeAreaView className="flex-1 bg-[#050816] items-center justify-between pb-8">
      <Stack.Screen options={{ gestureEnabled: false }} />

      <View className="w-full px-6 pt-4 pb-2 items-center">
        <Text className={`text-lg font-bold ${theme.textColor}`}>
          {theme.statusText} {round} / {totalRounds}
        </Text>
      </View>

      <TimerProgressBar 
        mode={isFocus ? 'FOCUS' : 'BREAK'}
        currentSession={round}
        totalSessions={totalRounds}
        timeLeft={phaseRemainingSec}
        totalDuration={phaseTotalSec}
        focusDuration={focusDurationSec}
        breakDuration={breakDurationSec}
      />

      <View className="flex-1 w-full items-center justify-center">
        <TimerCircle
          timeLeft={phaseRemainingSec}
          totalDuration={phaseTotalSec}
          strokeColor={theme.strokeColor}
          subStatusText={theme.subStatusText}
        />

        {!isFocus && (
          <View className="mt-8 items-center">
            <View className="bg-white/10 px-4 py-3 rounded-xl border border-white/20 mb-4">
              <Text className="text-white/80 text-sm">⚠️ 시작 1분 전에 알림이 울립니다.</Text>
            </View>
            <View className="items-center">
              <Text className="text-white/60 text-xs mb-1">현재 내 누적 이탈 시간</Text>
              <Text className="text-[#F85A5A] text-xl font-bold">{formatEscapeTime(myEscapeMs)}</Text>
            </View>
          </View>
        )}
      </View>

      <View className="w-full px-6">
        <Button title="탈옥하기" variant="outline" onPress={() => setIsModalOpen(true)} />
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-[#1E2538] w-full rounded-3xl p-6">
            <Text className="text-white text-lg font-bold mb-2">
              탈옥하시겠어요?
            </Text>
            <Text className="text-white/50 text-sm mb-8">탈옥하면 남은 시간이 모두 이탈 시간으로 처리돼요.</Text>
            <View className="flex-row gap-3">
              <Button 
                title="취소" variant="secondary" className="flex-1" 
                disabled={giveUpMutation.isPending} onPress={() => setIsModalOpen(false)} 
              />
              <Button 
                title={giveUpMutation.isPending ? "탈옥하는 중..." : "탈옥하기"} 
                variant="destructive" className="flex-1" 
                isLoading={giveUpMutation.isPending} disabled={giveUpMutation.isPending}
                onPress={() => giveUpMutation.mutate()} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}