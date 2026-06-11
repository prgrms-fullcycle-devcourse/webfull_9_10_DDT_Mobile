import React from 'react';
import { View, Text, Image, Pressable, Alert, Switch } from 'react-native';
import { Check, ShieldAlert } from 'lucide-react-native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';

// 에셋 이미지 매핑 객체
const PROFILE_MAP: Record<string, any> = {
  basic_image_key_01: require('../../../assets/images/avatars/bear.png'),
  basic_image_key_02: require('../../../assets/images/avatars/cat.png'),
  basic_image_key_03: require('../../../assets/images/avatars/crocodile.png'),
  basic_image_key_04: require('../../../assets/images/avatars/fox.png'),
  basic_image_key_05: require('../../../assets/images/avatars/hedgehog.png'),
  basic_image_key_06: require('../../../assets/images/avatars/monkey.png'),
  basic_image_key_07: require('../../../assets/images/avatars/penguin.png'),
  basic_image_key_08: require('../../../assets/images/avatars/pig.png'),
  basic_image_key_09: require('../../../assets/images/avatars/rabbit.png'),
  basic_image_key_10: require('../../../assets/images/avatars/shiba.png'),
};

export default function MemberSignList() {
  const socket = useSocket();
  const me = useAuthStore((state) => state.me);
  const members = useRoomStore((state) => state.members);
  const upsertMember = useRoomStore((state) => state.upsertMember);
  const hostId = useRoomStore((state) => state.hostId);

  if (!me) return null;

  const isHost = me.id === hostId;
  const myMember = members[me.id];
  const isMeSigned = myMember?.isSigned ?? false;
  const memberList = Object.entries(members);
  const signedCount = memberList.filter(([, m]) => m.isSigned).length;

  const handleKickMember = (targetId: string, nickname: string) => {
    if (!isHost) return;
    Alert.alert(
      '강제 퇴장',
      `${nickname} 님을 강제 퇴장 하시겠어요?\n강퇴당한 멤버는 재입장이 불가합니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '퇴장시키기', style: 'destructive', onPress: () => socket?.emit('member:kick', { targetId }) }
      ]
    );
  };

  const handleMemberEditToggle = (targetId: string, canEdit: boolean) => {
    upsertMember(targetId, { canEdit });
    socket?.emit('edit:member', { targetId, canEdit });
  };

  const handleSignToggle = () => {
    upsertMember(me.id, { isSigned: !isMeSigned });
    socket?.emit('member:sign', { signed: !isMeSigned });
  };
  
  return (
    <View className="mb-8">
      <View className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
        <View className="flex-row items-center justify-between p-4 border-b border-white/5">
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-full items-center justify-center border-2 ${isMeSigned ? 'border-[#10B981]' : 'border-white/20'} bg-[#1A1A2E] overflow-hidden`}>
              <Image source={PROFILE_MAP[myMember?.profileImage || 'basic_image_key_01']} className="w-8 h-8" />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="font-bold text-[#7c3aed]">{myMember?.nickname} (나)</Text>
                {isHost && (
                  <View className="ml-2 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                    <Text className="text-yellow-500 text-[10px] font-bold">방장</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* 💡 정적인 View에서 작동 가능한 Pressable로 변경 */}
          <Pressable onPress={handleSignToggle} className="active:opacity-70">
            {isMeSigned ? (
              <View className="bg-[#10B981]/20 px-3 py-1.5 rounded-full flex-row items-center">
                <Check color="#10B981" size={14} strokeWidth={3} />
                <Text className="text-[#10B981] text-xs font-bold ml-1">준비 완료</Text>
              </View>
            ) : (
              <View className="bg-[#7c3aed] px-3 py-1.5 rounded-full">
                <Text className="text-white text-xs font-bold">터치하여 서명</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* 다른 멤버들 */}
        {memberList.filter(([id]) => id !== me.id).map(([id, m], index) => (
          <View key={id} className={`flex-row items-center justify-between p-4 ${index !== memberList.length - 2 ? 'border-b border-white/5' : ''}`}>
            <View className="flex-row items-center flex-1">
              <View className={`w-10 h-10 rounded-full items-center justify-center border-2 ${m.isSigned ? 'border-[#10B981]' : 'border-white/20'} bg-[#1A1A2E] overflow-hidden`}>
                <Image source={PROFILE_MAP[m.profileImage || 'basic_image_key_01']} className="w-8 h-8" />
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-white">{m.nickname}</Text>
                  {m.isHost && (
                    <View className="ml-2 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                      <Text className="text-yellow-500 text-[10px] font-bold">방장</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-white/40 mt-1">
                  {m.connected ? '온라인' : '오프라인'}
                </Text>
              </View>
            </View>

            {/* 방장일 경우: 권한 토글 및 강퇴 버튼 */}
            {isHost ? (
              <View className="flex-row items-center gap-3">
                <Switch
                  value={m.canEdit ?? false}
                  onValueChange={(val) => handleMemberEditToggle(id, val)}
                  trackColor={{ false: '#374151', true: '#7c3aed' }}
                  thumbColor="#ffffff"
                />
                <Pressable onPress={() => handleKickMember(id, m.nickname)} className="p-1.5 bg-red-500/20 rounded-md">
                  <ShieldAlert color="#F85A5A" size={16} />
                </Pressable>
              </View>
            ) : (
              // 방장이 아닐 경우 서명 상태 표시
              m.isSigned ? (
                <View className="bg-[#10B981]/20 px-3 py-1.5 rounded-full flex-row items-center">
                  <Check color="#10B981" size={14} strokeWidth={3} />
                  <Text className="text-[#10B981] text-xs font-bold ml-1">준비 완료</Text>
                </View>
              ) : (
                <View className="bg-white/10 px-3 py-1.5 rounded-full">
                  <Text className="text-white/40 text-xs font-bold">서명 대기</Text>
                </View>
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}