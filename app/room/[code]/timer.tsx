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

/**
 * 뽀모도로 세션이 개시된 후 사용자의 백그라운드 이탈(딴짓)을 감지하고 남은 세션 시간을 동기화 표출하는 코어 타이머 렌더링 스크린입니다.
 * @returns {JSX.Element} 중앙 메인 시계 뷰 및 프로그래스 바 레이아웃
 */
export default function TimerScreen() {
  useKeepAwake(); // 타이머 구동 중 디바이스 화면이 자동으로 절전 소등되는 현상 하드웨어 차단

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

  // 로컬 타이머와 별개로, 앱이 백그라운드에 있을 때도 시간 종료 및 세션 페이즈 교대 알림을 정상 수신받기 위한 원격 푸시 토큰 레지스트리 발급 연동
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

  // 로드 밸런싱 서버 환경에서 TCP 커넥션이 조기 드롭되는 문제를 막기 위한 프론트엔드 발 주기적 생존 핑(Heartbeat) 발송 로직
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

  // 기기의 OS 상태(AppState) 변화를 추적하여, 사용자가 앱을 최소화하거나 다른 앱으로 스위칭할 시 즉각 서버에 이탈 신호를 전송하여 벌칙 타이머 카운팅을 개시함
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
        // 백그라운드에 오래 머무른 후 화면 복귀 시, 세션이 이미 완전히 만료되었을 경우를 대비하여 폴백 HTTP API 조회로 스토어 강제 싱크 최신화 수행
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
  // 서버와 클라이언트 디바이스간의 하드웨어 타이머 격차를 무효화하는 오프셋 보정 수치 도입하여 계산의 정밀도 향상
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
      {/* OS 기본 스와이프 백 제스처를 봉인하여 타이머 도중 실수로 인한 억울한 퇴장 방지 */}
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