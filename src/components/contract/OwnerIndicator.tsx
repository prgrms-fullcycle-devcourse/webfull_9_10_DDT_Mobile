import React from 'react';
import { View, Text } from 'react-native';
import { User } from 'lucide-react-native';
import { FocusedField } from '../../hooks/useYjsContract';

interface OwnerIndicatorProps {
  fieldKey: string;
  fieldOwners: Record<string, FocusedField>;
}

export default function OwnerIndicator({ fieldKey, fieldOwners }: OwnerIndicatorProps) {
  const owner = fieldOwners[fieldKey];
  if (!owner) return null;
  return (
    <View 
      className="flex-row items-center self-start rounded-full px-2 py-0.5 mt-1 border"
      style={{ borderColor: owner.color, backgroundColor: `${owner.color}15` }}
    >
      <User size={10} color={owner.color} />
      <Text style={{ color: owner.color }} className="text-[10px] font-bold ml-1">
        {owner.nickname}
      </Text>
    </View>
  );
}