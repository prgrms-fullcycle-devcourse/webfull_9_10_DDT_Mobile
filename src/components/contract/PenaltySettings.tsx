import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Penalty, FocusedField } from '../../hooks/useYjsContract';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';
import OwnerIndicator from './OwnerIndicator';

interface PenaltySettingsProps {
  penalties: Penalty[];
  addPenalty: (content: string) => void;
  updatePenalty: (index: number, content: string) => void;
  removePenalty: (index: number) => void;
  fieldOwners: Record<string, FocusedField>;
  handleFocus: (fieldKey: string, userId: string, nickname: string) => void;
  handleBlur: () => void;
}

/**
 * 개별 벌칙 항목 텍스트의 임시 수정을 바인딩하고 타이핑 도중 다른 참여자들과 레이스 컨디션 충돌이 발생하지 않도록 로컬 버퍼 상태를 제어하는 단독 인풋 서브 컴포넌트입니다.
 */
function PenaltyInput({ content, disabled, isOwned, ownerColor, onFocus, onBlur, onUpdate }: any) {
  const [draft, setDraft] = useState(content ?? '');
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) setDraft(content ?? '');
  }, [content]);

  return (
    <TextInput
      className={`flex-1 bg-[#1A1A2E] text-white px-4 h-12 rounded-xl border ${isOwned ? 'border-2' : 'border-white/10'} ${disabled ? 'opacity-50' : ''}`}
      style={isOwned ? { borderColor: ownerColor } : undefined}
      placeholder="예: 팔굽혀펴기 10회"
      placeholderTextColor="#6B7280"
      maxLength={50}
      value={draft}
      editable={!disabled}
      onFocus={() => {
        isEditingRef.current = true;
        onFocus();
      }}
      onChangeText={(val) => {
        setDraft(val);
        onUpdate(val);
      }}
      onBlur={() => {
        isEditingRef.current = false;
        onUpdate(draft);
        onBlur();
      }}
    />
  );
}

/**
 * 계약 서명 조건에 포함될 커스텀 벌칙 목록의 실시간 동적 추가, 내용 가공 및 리스트 파쇄 기능을 집약하여 바인딩하는 설정 구획 블록 컴포넌트입니다.
 * @param {PenaltySettingsProps} props - 벌칙 어레이 상태 및 CRDT 트랜잭션 수정을 위한 트리거 모음
 * @returns {JSX.Element | null} 벌칙 리스트 보드 UI 섹션
 */
export default function PenaltySettings({ penalties, addPenalty, updatePenalty, removePenalty, fieldOwners, handleFocus, handleBlur }: PenaltySettingsProps) {
  const me = useAuthStore((s) => s.me);
  const members = useRoomStore((s) => s.members);

  if (!me) return null;
  
  const myMember = members[me.id];
  const canEdit = myMember?.isHost || (myMember?.canEdit ?? false);
  const myNickname = myMember?.nickname ?? me.nickname;

  return (
    <View className="mb-6 mx-4">
      <View className="flex-row justify-between items-end mb-3 ml-1 pr-1">
        <Text className="text-white/85 font-bold text-[15px]">벌칙 목록</Text>
        <Text className="text-white/40 text-xs">벌칙은 중복될 수 있음</Text>
      </View>
      <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-4">
        {penalties.map((p, i) => {
          const penaltyKey = `penalty_${p.id}`;
          const isOwned = !!fieldOwners[penaltyKey];
          const isLockedByOther = isOwned && fieldOwners[penaltyKey].userId !== me.id;

          return (
            <View key={p.id} className="gap-1">
              <OwnerIndicator fieldKey={penaltyKey} fieldOwners={fieldOwners} />
              <View className="flex-row items-center gap-2">
                <PenaltyInput
                  content={p.content}
                  disabled={!canEdit || isLockedByOther}
                  isOwned={isOwned}
                  ownerColor={fieldOwners[penaltyKey]?.color}
                  onFocus={() => handleFocus(penaltyKey, me.id, myNickname)}
                  onBlur={handleBlur}
                  onUpdate={(val: string) => updatePenalty(i, val)}
                />
                {canEdit && (
                  <Pressable
                    onPress={() => removePenalty(i)}
                    className="w-12 h-12 bg-white/5 items-center justify-center rounded-xl border border-white/10"
                  >
                    <X color="#F85A5A" size={20} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {canEdit && (
          <Pressable
            onPress={() => addPenalty('')}
            className="w-full py-3 mt-1 border border-dashed border-[#7c3aed] rounded-xl flex-row items-center justify-center gap-2"
          >
            <Plus color="#7c3aed" size={18} />
            <Text className="text-[#7c3aed] font-bold">벌칙 추가</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}