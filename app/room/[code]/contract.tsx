import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldAlert, Play } from 'lucide-react-native';

import { useRoom } from '../../../src/contexts/RoomContext';
import { useSocket } from '../../../src/contexts/SocketContext';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useRoomStore } from '../../../src/store/useRoomStore';
import { useYjsContract } from '../../../src/hooks/useYjsContract';

import { getRoomApi } from '../../../src/api/generated/room-api/room-api';
import { getTimerApi } from '../../../src/api/generated/timer-api-타이머-및-세션-제어/timer-api-타이머-및-세션-제어';
import { getRuleApi } from '../../../src/api/generated/rule-api-계약서-관리/rule-api-계약서-관리';
import axiosClient from '../../../src/api/axiosClient';
import { toBackendFormat } from '../../../src/lib/contractTransform';

import RoomTitle from '../../../src/components/contract/RoomTitle';
import TimerSettings from '../../../src/components/contract/TimerSettings';
import PenaltySettings from '../../../src/components/contract/PenaltySettings';
import TierSettings from '../../../src/components/contract/TierSettings';
import EditPermissionToggle from '../../../src/components/contract/EditPermissionToggle';
import MemberSignList from '../../../src/components/contract/MemberSignList';
import { Button } from '../../../src/components/ui/Button';
import { ContractActions } from '../../../src/components/contract/ContractActions';

export default function ContractScreen() {
  const router = useRouter();
  const { code } = useGlobalSearchParams<{ code: string }>();
  const room = useRoom();
  const socket = useSocket();
  const me = useAuthStore((s) => s.me);
  
  const members = useRoomStore((s) => s.members);
  const hostId = useRoomStore((s) => s.hostId);
  const phase = useRoomStore((s) => s.phase); 

  const [isStarting, setIsStarting] = useState(false);

  const isHost = me?.id === hostId;
  const myMember = me ? members[me.id] : undefined;
  const isMeSigned = myMember?.isSigned ?? false;

  const memberList = Object.values(members);
  const signedCount = memberList.filter((m) => m.isSigned).length;
  const allSigned = memberList.length > 0 && signedCount === memberList.length;

  const { 
    fields, updateField, 
    tiers, addTier, updateTier, setTierBoundary, removeTier,
    penalties, addPenalty, updatePenalty, removePenalty,
    isConnected, fieldOwners, handleFocus, handleBlur, applyAll
  } = useYjsContract(
    room.code,
    !!me,
    isHost
  );

  useEffect(() => {
    if (phase === 'timer') {
      router.replace(`/room/${code}/timer`);
    } else if (phase === 'result') {
      router.replace(`/room/${code}/semi-result`);
    }
  }, [phase, code, router]);

  useEffect(() => {
    if (!socket) return;
    const handleSessionStarted = () => {
      router.replace(`/room/${code}/timer`);
    };
    socket.on('session:started', handleSessionStarted);
    return () => {
      socket.off('session:started', handleSessionStarted);
    };
  }, [socket, router, code]);

  const handleLeaveRoom = () => {
    Alert.alert(
      isHost ? '방 폭파' : '방 나가기',
      isHost ? '방장이 나가면 방이 사라집니다. 정말 나가시겠어요?' : '정말 방에서 나가시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              await getRoomApi(axiosClient).roomControllerLeaveRoom(room.code);
              router.replace('/');
            } catch (err) {
              Alert.alert('오류', '퇴장 처리에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleSignToggle = () => {
    socket?.emit('member:sign', { signed: !isMeSigned });
  };

  const handleStartTimer = async (force: boolean) => {
    if (!isHost) return;
    setIsStarting(true);
    try {
      const dto = toBackendFormat(fields, tiers, penalties);
      await getRuleApi(axiosClient).ruleControllerCreateRoomRule(room.code, dto);

      const timerApi = getTimerApi(axiosClient);
      if (force) {
        await timerApi.timerControllerForceStartTimer(room.code);
      } else {
        await timerApi.timerControllerStartTimer(room.code);
      }
    } catch (_err: any) {
      Alert.alert('시작 실패', _err.response?.data?.message || '오류가 발생했습니다.');
      setIsStarting(false);
    }
  };

  if (!me) return null;

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <View className="flex-row items-center">
          <Pressable onPress={handleLeaveRoom} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-1">계약서 작성</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
          <ContractActions fields={fields} tiers={tiers} penalties={penalties} applyAll={applyAll} />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <RoomTitle title={room.title} code={room.code} isConnected={isConnected} />
        
        {isHost && <EditPermissionToggle />}

        <TimerSettings fields={fields} fieldOwners={fieldOwners} updateField={updateField} handleFocus={handleFocus} handleBlur={handleBlur} />

        <PenaltySettings penalties={penalties} addPenalty={addPenalty} updatePenalty={updatePenalty} removePenalty={removePenalty} fieldOwners={fieldOwners} handleFocus={handleFocus} handleBlur={handleBlur} />

        <TierSettings tiers={tiers} addTier={addTier} updateTier={updateTier} setTierBoundary={setTierBoundary} removeTier={removeTier} fieldOwners={fieldOwners} handleFocus={handleFocus} handleBlur={handleBlur} />

        <View className="mx-4 mt-6 mb-10">
          <View className="items-center mb-5">
            <Text className="text-lg text-[#10B981] font-bold">모든 멤버가 서명해야</Text>
            <Text className="text-lg text-[#10B981] font-bold">타이머를 시작할 수 있어요!</Text>
          </View>
          <MemberSignList />
        </View>
      </ScrollView>

      {/* 하단 액션 버튼 영역 */}
      <View className="px-4 py-4 bg-[#050816] border-t border-white/10 flex-row gap-2">
        <Button title="나가기" variant="outline" onPress={handleLeaveRoom} className="flex-1 bg-[#111827] border-white/10" />
        {!isMeSigned ? (
            <Button
              title="계약서 서명하기"
              variant="primary"
              onPress={handleSignToggle}
              className="flex-1"
            />
          ) : (
            <>
              {isHost && !allSigned && (
                <Button variant="destructive" onPress={() => handleStartTimer(true)} className="flex-1">
                  <View className="flex-row items-center justify-center">
                    <ShieldAlert color="white" size={18} />
                    <Text className="font-bold text-[16px] text-white ml-2">강제 시작</Text>
                  </View>
                </Button>
              )}

              {isHost && allSigned && (
                <Button disabled={isStarting} isLoading={isStarting} onPress={() => handleStartTimer(false)} className="flex-1">
                  <View className="flex-row items-center justify-center">
                    {!isStarting && <Play color="white" size={18} />}
                    <Text className="font-bold text-[16px] text-white ml-2">
                      {isStarting ? '시작 중...' : '집중 시작'}
                    </Text>
                  </View>
                </Button>
              )}

              {!isHost && (
                <Button
                  title="서명 완료 (취소하기)"
                  variant="outline"
                  onPress={handleSignToggle}
                  className="flex-1 border-[#10B981] bg-[#10B981]/10"
                />
              )}
            </>
          )}
        </View>
    </SafeAreaView>
  );
}