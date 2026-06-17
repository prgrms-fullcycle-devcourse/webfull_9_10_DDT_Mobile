import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Tier, FocusedField } from '../../hooks/useYjsContract';
import OwnerIndicator from './OwnerIndicator';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';

interface TierSettingsProps {
  tiers: Tier[];
  addTier: () => void;
  updateTier: (index: number, updated: Partial<Tier>) => void;
  setTierBoundary: (index: number, maxPct: number) => void;
  removeTier: (index: number) => void;
  fieldOwners: Record<string, FocusedField>;
  handleFocus: (fieldKey: string, userId: string, nickname: string) => void;
  handleBlur: () => void;
}

const DEFAULT_TIER = { tier: 1, minPct: 0, maxPct: null, count: 0 };

/**
 * 이탈 시간 비율 및 확정 벌칙 부과 개수 수치를 가공 제어하고 실시간 원격 타이핑 충돌을 격리 방어해주는 미니 포커스 보완 인풋 컴포넌트입니다.
 */
function DraftNumberInput({ value, min, max, disabled, isOwned, ownerColor, onFocus, onBlur, onCommit }: any) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) setDraft(value === null ? '' : String(value));
  }, [value]);

  return (
    <TextInput
      className={`bg-white/5 text-white text-center h-10 px-2 rounded-lg border ${isOwned ? 'border-2' : 'border-transparent'} ${disabled ? 'opacity-50' : ''}`}
      style={isOwned ? { borderColor: ownerColor } : undefined}
      keyboardType="number-pad"
      value={draft}
      editable={!disabled}
      placeholder="Max"
      placeholderTextColor="#6B7280"
      onFocus={() => {
        isEditingRef.current = true;
        onFocus();
      }}
      onChangeText={(val) => {
        setDraft(val);
        if (val !== '') {
          const n = parseInt(val);
          if (!isNaN(n) && n >= min && (max === undefined || n <= max)) {
            onCommit(n);
          }
        }
      }}
      onBlur={() => {
        isEditingRef.current = false;
        let n = parseInt(draft);
        if (isNaN(n)) n = min;
        n = Math.max(min, Math.min(n, max ?? n));
        setDraft(String(n));
        onCommit(n);
        onBlur();
      }}
    />
  );
}

/**
 * 스터디 총 진행 시간 대비 딴짓(이탈)을 저지른 비율 계층별로 적용할 총 벌칙 차등 부과 등급(티어) 수치를 조율 제어하는 구획 관리 컴포넌트입니다.
 * @param {TierSettingsProps} props - 계층별 한계 수치 배열 정보 및 수정 권한 래퍼 함수군
 * @returns {JSX.Element | null} 티어별 분기점 설정 박스 블록 UI
 */
export default function TierSettings({ tiers, addTier, updateTier, setTierBoundary, removeTier, fieldOwners, handleFocus, handleBlur }: TierSettingsProps) {
  const me = useAuthStore((s) => s.me);
  const members = useRoomStore((s) => s.members);

  if (!me) return null;
  
  const myMember = members[me.id];
  const canEdit = myMember?.isHost || (myMember?.canEdit ?? false);
  const myNickname = myMember?.nickname ?? me.nickname;

  const isFallback = tiers.length === 0;
  const displayTiers = isFallback ? [DEFAULT_TIER] : tiers;

  const canAddTier = (() => {
    if (!canEdit) return false;
    if (tiers.length === 0) return true;
    const last = tiers[tiers.length - 1];
    return last.minPct < 99;
  })();

  return (
    <View className="mb-6 mx-4">
      <View className="flex-row items-center justify-between mb-3 ml-1 pr-1">
        <Text className="text-white/85 font-bold text-[15px]">벌칙 강도</Text>
      </View>
      <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-4">
        {displayTiers.map((tier, i) => {
          const tierKey = `tier_${i}`;
          const isOwned = !!fieldOwners[tierKey];
          const isLockedByOther = isOwned && fieldOwners[tierKey].userId !== me.id;
          const isLastTier = i === displayTiers.length - 1;

          return (
            <View key={`tier-${i}`} className="gap-2">
              <View className="bg-[#7c3aed] self-start px-2.5 py-1 rounded-md mb-1">
                <Text className="text-white text-xs font-bold">{tier.tier}단계</Text>
              </View>
              <OwnerIndicator fieldKey={tierKey} fieldOwners={fieldOwners} />
              <View className="flex-row items-center justify-between bg-[#1A1A2E] p-3 rounded-xl border border-white/10">
                <View className="flex-row items-center flex-1">
                  <Text className="text-white/80 text-sm w-12">{tier.minPct}% ~</Text>
                  <View className="w-14 ml-1">
                    {isLastTier ? (
                      <View className="h-10 items-center justify-center bg-white/5 rounded-lg">
                        <Text className="text-white/50 text-sm">100</Text>
                      </View>
                    ) : (
                      <DraftNumberInput
                        value={tier.maxPct}
                        min={tier.minPct + 1}
                        max={99}
                        disabled={!canEdit || isLockedByOther}
                        isOwned={isOwned}
                        ownerColor={fieldOwners[tierKey]?.color}
                        onFocus={() => handleFocus(tierKey, me.id, myNickname)}
                        onBlur={handleBlur}
                        onCommit={(val: number) => setTierBoundary(i, val)}
                      />
                    )}
                  </View>
                  <Text className="text-white/50 text-sm ml-1">%</Text>
                </View>

                <View className="flex-row items-center ml-2 border-l border-white/10 pl-3">
                  <Text className="text-white/80 text-sm">벌칙</Text>
                  <View className="w-12 mx-2">
                    <DraftNumberInput
                      value={tier.count}
                      min={0}
                      disabled={!canEdit || isLockedByOther}
                      isOwned={isOwned}
                      ownerColor={fieldOwners[tierKey]?.color}
                      onFocus={() => handleFocus(tierKey, me.id, myNickname)}
                      onBlur={handleBlur}
                      onCommit={(val: number) => updateTier(i, { count: val })}
                    />
                  </View>
                  <Text className="text-white/50 text-sm mr-1">개</Text>
                  {canEdit && displayTiers.length > 1 && i !== 0 && (
                    <Pressable onPress={() => removeTier(i)} className="p-1">
                      <X color="#F85A5A" size={18} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {canEdit && (
          <>
            {!canAddTier && (
              <Text className="text-white/40 text-xs text-center">더 이상 추가할 수 없습니다. 입력값을 확인해주세요.</Text>
            )}
            <Pressable
              disabled={!canAddTier}
              onPress={addTier}
              className={`w-full py-3 mt-2 rounded-xl flex-row items-center justify-center gap-2 border ${
                canAddTier ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/5 opacity-50'
              }`}
            >
              <Plus color={canAddTier ? "white" : "gray"} size={18} />
              <Text className={canAddTier ? "text-white font-bold" : "text-gray-500 font-bold"}>단계 추가</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}