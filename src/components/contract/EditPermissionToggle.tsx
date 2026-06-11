import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Unlock, Lock } from 'lucide-react-native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';

export default function EditPermissionToggle() {
  const socket = useSocket();
  const me = useAuthStore((state) => state.me);
  const members = useRoomStore((state) => state.members);
  const upsertMember = useRoomStore((state) => state.upsertMember);
  const hostId = useRoomStore((state) => state.hostId);

  const isHost = me?.id === hostId;
  const hostOnly = Object.values(members).some((m) => !m.isHost && m.canEdit === false);
  const allCanEdit = !hostOnly;

  const handleToggle = (value: boolean) => {
    if (!socket || !isHost) return;
    
    Object.entries(members).forEach(([uid, m]) => {
      if (!m.isHost) {
        upsertMember(uid, { canEdit: value });
      }
    });

    socket.emit('edit:all', { canEdit: value });
  };

  return (
    <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 mb-4 mt-2 mx-4">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-base font-bold">계약서 편집 권한</Text>
          {allCanEdit ? <Unlock color="#A855F7" size={16} /> : <Lock color="#A855F7" size={16} />}
        </View>
        <Switch
          value={allCanEdit}
          onValueChange={handleToggle}
          disabled={!isHost}
          trackColor={{ false: '#374151', true: '#7c3aed' }}
          thumbColor="#ffffff"
        />
      </View>
      <Text className="text-white/50 text-xs mt-1">
        {hostOnly ? '방장만 편집 가능' : '모든 멤버가 편집 가능'} (OFF 시 방장 전용)
      </Text>
    </View>
  );
}