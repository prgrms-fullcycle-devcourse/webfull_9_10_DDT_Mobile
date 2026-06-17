import React from 'react';
import { View, Text } from 'react-native';
import { User } from 'lucide-react-native';
import { FocusedField } from '../../hooks/useYjsContract';

interface OwnerIndicatorProps {
  fieldKey: string;
  fieldOwners: Record<string, FocusedField>;
}

/**
 * 실시간 협업 에디터 모드에서 특정 입력 폼 요소를 임의의 다른 유저가 선점하여 터치/입력하고 있을 때, 해당 필드 바로 하단에 소유자의 지시선 및 이름을 오버레이해주는 동시 편집 상태 표시 컴포넌트입니다.
 * @param {OwnerIndicatorProps} props - 타겟 필드 고유 아이디 및 전체 소유주 데이터 맵
 * @returns {JSX.Element | null} 소유주가 부재하면 null, 존재 시 고유 아바타 뱃지 라벨 출력
 */
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