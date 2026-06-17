import React, { useState, useEffect } from 'react';
import { View, Text, Switch } from 'react-native';
import { Unlock, Lock } from 'lucide-react-native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';

/**
 * 방장이 대기실 내의 모든 비방장 참여자들에게 계약서 편집 권한을 일괄적으로 허용하거나 차단할 수 있는 스위치 토글 컴포넌트입니다.
 * @returns {JSX.Element} 권한 제어 스위치 레이아웃
 */
export default function EditPermissionToggle() {
  const socket = useSocket();
  const me = useAuthStore((state) => state.me);
  const members = useRoomStore((state) => state.members);
  const updateAllNonHostsCanEdit = useRoomStore((state) => state.updateAllNonHostsCanEdit);
  const hostId = useRoomStore((state) => state.hostId);

  const isHost = me?.id === hostId;
  const hostOnly = Object.values(members).some((m) => !m.isHost && m.canEdit === false);
  const allCanEdit = !hostOnly;

  // 웹소켓 패킷 브로드캐스트 지연 시간으로 인해 사용자가 스위치를 누르는 순간 물리 버튼이 반대로 자꾸 복구(튕김 연출)되는 버그를 잡기 위해 엄격한 동기화용 로컬 독립 상태 도입
  const [localToggle, setLocalToggle] = useState(allCanEdit);

  useEffect(() => {
    setLocalToggle(allCanEdit);
  }, [allCanEdit]);

  const handleToggle = (value: boolean) => {
    if (!socket || !isHost) return;
    
    setLocalToggle(value); 
    updateAllNonHostsCanEdit(value);
    socket.emit('edit:all', { canEdit: value });
  };

  return (
    <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 mb-4 mt-2 mx-4">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-base font-bold">계약서 편집 권한</Text>
          {localToggle ? <Unlock color="#A855F7" size={16} /> : <Lock color="#A855F7" size={16} />}
        </View>
        <Switch
          value={localToggle}
          onValueChange={handleToggle}
          disabled={!isHost}
          trackColor={{ false: '#374151', true: '#7c3aed' }}
          thumbColor="#ffffff"
        />
      </View>
      <Text className="text-white/50 text-xs mt-1">
        {!localToggle ? '방장만 편집 가능' : '모든 멤버가 편집 가능'} (OFF 시 방장 전용)
      </Text>
    </View>
  );
}