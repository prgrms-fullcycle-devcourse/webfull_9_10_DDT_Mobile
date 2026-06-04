import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldAlert, Play } from 'lucide-react-native';

import { useRoom } from '../../../src/contexts/RoomContext';
import { useSocket } from '../../../src/contexts/SocketContext';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useRoomStore } from '../../../src/store/useRoomStore';
import { useYjsContract } from '../../../src/hooks/useYjsContract';

import { getRoomApi } from '../../../src/api/generated/room-api/room-api';
import { getTimerApi } from '../../../src/api/generated/timer-api-타이머-및-세션-제어/timer-api-타이머-및-세션-제어';
import axiosClient from '../../../src/api/axiosClient';

import PenaltySettings from '../../../src/components/contract/PenaltySettings';
import TierSettings from '../../../src/components/contract/TierSettings';
import EditPermissionToggle from '../../../src/components/contract/EditPermissionToggle';
import MemberSignList from '../../../src/components/contract/MemberSignList';

import { ContractActions } from '../../../src/components/contract/ContractActions';

export default function ContractScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const room = useRoom();
  const socket = useSocket();
  const me = useAuthStore((s) => s.me);
  
  const members = useRoomStore((s) => s.members);
  const hostId = useRoomStore((s) => s.hostId);

  const [isStarting, setIsStarting] = useState(false);

  const isHost = me?.id === hostId;
  const myMember = me ? members[me.id] : undefined;
  const isMeSigned = myMember?.isSigned ?? false;
  const canEdit = myMember?.canEdit ?? false;

  const memberList = Object.values(members);
  const signedCount = memberList.filter((m) => m.isSigned).length;
  const allSigned = memberList.length > 0 && signedCount === memberList.length;

  const { 
    fields, updateField, 
    tiers, addTier, updateTier, removeTier,
    penalties, addPenalty, updatePenalty, removePenalty,
    isConnected,
    applyAll
  } = useYjsContract(
    room.code,
    !!me,
    isHost
  );

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

  // 총 예상 시간 계산
  const { focusMin, breakMin, rounds } = fields;
  const totalMin = focusMin * rounds + breakMin * Math.max(0, rounds - 1);
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0분';
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}시간` : `${hours}시간 ${mins}분`;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050816]">
      {/* 헤더 영역 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <View className="flex-row items-center">
          <Pressable onPress={handleLeaveRoom} className="p-2">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-1">계약서 작성</Text>
        </View>
        
        <View className="flex-row items-center gap-2">
          {/* 연결 상태 뱃지 */}
          <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          
          <ContractActions
            fields={fields}
            tiers={tiers}
            penalties={penalties}
            applyAll={applyAll}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        
        <View className="bg-[#111827] border border-white/10 rounded-2xl p-5 mb-4">
          <Text className="text-white text-xl font-bold mb-1">{room.title}</Text>
          <Text className="text-white/50 text-sm mb-4">방 코드: {room.code}</Text>
          <Text className="text-white/80 leading-relaxed">
            모든 멤버가 서명을 완료해야 집중 타이머를 시작할 수 있습니다. 규칙을 함께 수정해 보세요.
          </Text>
        </View>

        {isHost && <EditPermissionToggle />}

        {/* 💡 복구된 타이머 설정 영역 */}
        <View className="mb-6 mt-2">
          <Text className="text-white/85 font-bold text-[15px] mb-3 ml-1">타이머 설정</Text>
          <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-4">
            
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 font-medium">집중 시간 (분)</Text>
              <TextInput
                className={`bg-[#1A1A2E] text-white px-4 h-12 w-24 rounded-xl text-center border border-white/10 ${!canEdit ? 'opacity-50' : ''}`}
                keyboardType="number-pad"
                value={String(fields.focusMin || '')}
                onChangeText={(val) => updateField('focusMin', parseInt(val) || 0)}
                editable={canEdit}
              />
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 font-medium">휴식 시간 (분)</Text>
              <TextInput
                className={`bg-[#1A1A2E] text-white px-4 h-12 w-24 rounded-xl text-center border border-white/10 ${!canEdit ? 'opacity-50' : ''}`}
                keyboardType="number-pad"
                value={String(fields.breakMin || '')}
                onChangeText={(val) => updateField('breakMin', parseInt(val) || 0)}
                editable={canEdit}
              />
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 font-medium">반복 횟수 (회)</Text>
              <TextInput
                className={`bg-[#1A1A2E] text-white px-4 h-12 w-24 rounded-xl text-center border border-white/10 ${!canEdit ? 'opacity-50' : ''}`}
                keyboardType="number-pad"
                value={String(fields.rounds || '')}
                onChangeText={(val) => updateField('rounds', parseInt(val) || 0)}
                editable={canEdit}
              />
            </View>

            <View className="border-t border-white/10 my-1" />
            
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 font-medium">총 예상 시간</Text>
              <Text className="text-[#7c3aed] text-xl font-extrabold pr-1">
                {formatTime(totalMin)}
              </Text>
            </View>

          </View>
        </View>

        <PenaltySettings
          penalties={penalties}
          addPenalty={addPenalty}
          updatePenalty={updatePenalty}
          removePenalty={removePenalty}
          canEdit={canEdit}
        />

        <TierSettings
          tiers={tiers}
          addTier={addTier}
          updateTier={updateTier}
          removeTier={removeTier}
          canEdit={canEdit}
        />

        <MemberSignList />
      </ScrollView>

      {/* 하단 액션 버튼 영역 */}
      <View className="px-4 py-4 bg-[#050816] border-t border-white/10 flex-row gap-3">
        <Pressable
          onPress={handleSignToggle}
          className={`flex-1 py-4 rounded-2xl items-center border ${
            isMeSigned ? 'bg-transparent border-[#10B981]' : 'bg-[#242136] border-[#914CFF]'
          }`}
        >
          <Text className={`font-bold text-base ${isMeSigned ? 'text-[#10B981]' : 'text-white'}`}>
            {isMeSigned ? '서명 취소' : '계약서 서명하기'}
          </Text>
        </Pressable>

        {isHost && (
          <Pressable
            disabled={isStarting}
            onPress={() => handleStartTimer(!allSigned)}
            className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center ${
              allSigned ? 'bg-[#7c3aed]' : 'bg-[#EF4444]'
            }`}
          >
            {allSigned ? <Play color="white" size={18} /> : <ShieldAlert color="white" size={18} />}
            <Text className="font-bold text-base text-white ml-2">
              {allSigned ? '집중 시작' : '강제 시작'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}