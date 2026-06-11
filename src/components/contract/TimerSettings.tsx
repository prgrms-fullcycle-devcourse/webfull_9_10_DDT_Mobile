// src/components/contract/TimerSettings.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { ContractFields, FocusedField } from '../../hooks/useYjsContract';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';
import OwnerIndicator from './OwnerIndicator';

interface TimerSettingsProps {
  fields: ContractFields;
  fieldOwners: Record<string, FocusedField>;
  updateField: (key: keyof ContractFields, value: number) => void;
  handleFocus: (fieldKey: string, userId: string, nickname: string) => void;
  handleBlur: () => void;
}

function formatTime(minutes: number): string {
  if (minutes === 0) return '0분';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}시간` : `${hours}시간 ${mins}분`;
}

interface TimerNumberInputProps {
  value: number;
  min: number;
  max?: number;
  disabled: boolean;
  isOwned: boolean;
  ownerColor?: string;
  onFocus: () => void;
  onBlur: () => void;
  onCommit: (value: number) => void;
}

function TimerNumberInput({ value, min, max, disabled, isOwned, ownerColor, onFocus, onBlur, onCommit }: TimerNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) setDraft(String(value));
  }, [value]);

  return (
    <TextInput
      className={`bg-[#1A1A2E] text-white px-3 h-12 w-20 rounded-xl text-center border ${isOwned ? 'border-2' : 'border-white/10'} ${disabled ? 'opacity-50' : ''}`}
      style={isOwned ? { borderColor: ownerColor } : undefined}
      keyboardType="number-pad"
      value={draft}
      editable={!disabled}
      onFocus={() => {
        isEditingRef.current = true;
        setDraft(''); // 💡 터치 시 값을 비워서 즉시 입력 가능하게 함
        onFocus();
      }}
      onChangeText={(val) => {
        // 모바일 환경에서 숫자 외의 값(공백, 문자 등) 필터링
        const numericVal = val.replace(/[^0-9]/g, '');
        setDraft(numericVal);
        
        if (numericVal !== '') {
          const n = parseInt(numericVal, 10);
          if (!isNaN(n) && n >= min && (max === undefined || n <= max)) {
            onCommit(n); // 범위 내의 숫자일 때만 실시간 동기화
          }
        }
      }}
      onBlur={() => {
        isEditingRef.current = false;
        let n = parseInt(draft, 10);
        
        // 💡 빈칸인 채로 키보드를 닫으면 최소값(1)이 아니라 '원래 있던 값'으로 원상복구
        if (isNaN(n)) {
          n = value;
        }
        
        n = Math.max(min, Math.min(n, max ?? n));
        setDraft(String(n));
        onCommit(n);
        onBlur();
      }}
    />
  );
}

export default function TimerSettings({ fields, fieldOwners, updateField, handleFocus, handleBlur }: TimerSettingsProps) {
  const me = useAuthStore((s) => s.me);
  const members = useRoomStore((s) => s.members);

  if (!me) return null;

  const myMember = members[me.id];
  const canEdit = myMember?.canEdit ?? false;
  const myNickname = myMember?.nickname ?? me.nickname;

  const { focusMin, breakMin, rounds } = fields;
  const totalMin = focusMin * rounds + breakMin * Math.max(0, rounds - 1);
  const MAX_TOTAL_MIN = 600;

  const maxFocusMin = Math.max(1, Math.floor((MAX_TOTAL_MIN - breakMin * Math.max(0, rounds - 1)) / rounds));
  const maxBreakMin = rounds > 1 ? Math.max(1, Math.floor((MAX_TOTAL_MIN - focusMin * rounds) / (rounds - 1))) : 59;
  const maxRounds = Math.max(1, Math.floor(MAX_TOTAL_MIN / (focusMin + breakMin)));

  return (
    <View className="mb-6 mx-4">
      <View className="flex-row justify-between items-end mb-3 ml-1 pr-1">
        <Text className="text-white/85 font-bold text-[15px]">타이머 설정</Text>
        <Text className="text-white/40 text-xs">최대 10시간</Text>
      </View>
      <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-4">
        
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white/80 font-medium">집중 시간 <Text className="text-white/40 text-xs">(최대 120분)</Text></Text>
            <OwnerIndicator fieldKey="focusMin" fieldOwners={fieldOwners} />
          </View>
          <View className="flex-row items-center">
            <TimerNumberInput
              value={focusMin}
              min={1}
              max={maxFocusMin < 120 ? maxFocusMin : 120}
              isOwned={!!fieldOwners['focusMin']}
              ownerColor={fieldOwners['focusMin']?.color}
              disabled={!canEdit || (!!fieldOwners['focusMin'] && fieldOwners['focusMin'].userId !== me.id)}
              onFocus={() => handleFocus('focusMin', me.id, myNickname)}
              onBlur={handleBlur}
              onCommit={(val) => updateField('focusMin', val)}
            />
            <Text className="text-white ml-2 text-sm">분</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white/80 font-medium">휴식 시간 <Text className="text-white/40 text-xs">(최대 120분)</Text></Text>
            <OwnerIndicator fieldKey="breakMin" fieldOwners={fieldOwners} />
          </View>
          <View className="flex-row items-center">
            <TimerNumberInput
              value={breakMin}
              min={1}
              max={maxBreakMin < 120 ? maxBreakMin : 120}
              isOwned={!!fieldOwners['breakMin']}
              ownerColor={fieldOwners['breakMin']?.color}
              disabled={!canEdit || (!!fieldOwners['breakMin'] && fieldOwners['breakMin'].userId !== me.id)}
              onFocus={() => handleFocus('breakMin', me.id, myNickname)}
              onBlur={handleBlur}
              onCommit={(val) => updateField('breakMin', val)}
            />
            <Text className="text-white ml-2 text-sm">분</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white/80 font-medium">반복 횟수 <Text className="text-white/40 text-xs">(최대 20회)</Text></Text>
            <OwnerIndicator fieldKey="rounds" fieldOwners={fieldOwners} />
          </View>
          <View className="flex-row items-center">
            <TimerNumberInput
              value={rounds}
              min={1}
              max={maxRounds < 20 ? maxRounds : 20}
              isOwned={!!fieldOwners['rounds']}
              ownerColor={fieldOwners['rounds']?.color}
              disabled={!canEdit || (!!fieldOwners['rounds'] && fieldOwners['rounds'].userId !== me.id)}
              onFocus={() => handleFocus('rounds', me.id, myNickname)}
              onBlur={handleBlur}
              onCommit={(val) => updateField('rounds', val)}
            />
            <Text className="text-white ml-2 text-sm">회</Text>
          </View>
        </View>

        <View className="border-t border-white/10 my-1" />
        <View className="flex-row items-center justify-between">
          <Text className="text-white/80 font-medium">총 예상 시간</Text>
          <Text className="text-[#7c3aed] text-xl font-extrabold pr-1">{formatTime(totalMin)}</Text>
        </View>
      </View>
    </View>
  );
}