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

/**
 * 상위에서 할당받은 분(Minute) 단위를 휴먼 가독성이 극대화된 시간 및 분 조합 문자열로 반환 포맷팅합니다.
 * @param {number} minutes - 파싱 타겟 분 수치
 * @returns {string} 파싱 조합 완료된 시간 텍스트 (ex: "2시간 30분")
 */
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

/**
 * 타이머 수치 조율창에서 사용자 터치 입력이 들어올 때 실시간 패킷 동화 처리를 전담하는 특화 수치 포커스 인풋창 컴포넌트입니다.
 */
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
        // 모바일 기기 터치 입력 편의성을 극대화하기 위해 포커싱 즉시 기존 숫자를 공백 소거하여 유저가 바로 원하는 타이머 숫자를 기입할 수 있게 우회 유도
        setDraft(''); 
        onFocus();
      }}
      onChangeText={(val) => {
        // 안드로이드 패드 서드파티 키보드 등에서 간헐적으로 발생하는 천지인 특수문자나 공백 기입 버그를 차단하기 위해 숫자 외 데이터 정규식 필터 클렌징 적용
        const numericVal = val.replace(/[^0-9]/g, '');
        setDraft(numericVal);
        
        if (numericVal !== '') {
          const n = parseInt(numericVal, 10);
          if (!isNaN(n) && n >= min && (max === undefined || n <= max)) {
            onCommit(n); 
          }
        }
      }}
      onBlur={() => {
        isEditingRef.current = false;
        let n = parseInt(draft, 10);
        
        // 사용자가 적혀있던 숫자를 백스페이스로 다 지우고 빈칸인 상태 그대로 키보드를 닫아버릴 경우, 0분/최소값 추락 버그를 완화하기 위해 기존 실 보유값으로 원상 복구 복원
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

/**
 * 뽀모도로 스타일 스터디 집중 사이클의 세부 타이머 수치(단일 집중 시간, 휴식 유예 시간, 계획 총 사이클 라운드 횟수)를 정밀 제어하는 메인 컴포넌트입니다.
 * @param {TimerSettingsProps} props - Yjs 실시간 필드 정보 및 소유주 추적 동기화 핸들러
 * @returns {JSX.Element | null} 타이머 조율 구획 카드 패널 UI
 */
export default function TimerSettings({ fields, fieldOwners, updateField, handleFocus, handleBlur }: TimerSettingsProps) {
  const me = useAuthStore((s) => s.me);
  const members = useRoomStore((s) => s.members);

  if (!me) return null;

  const myMember = members[me.id];
  const canEdit = myMember?.isHost || (myMember?.canEdit ?? false);
  const myNickname = myMember?.nickname ?? me.nickname;

  const { focusMin, breakMin, rounds } = fields;
  const totalMin = focusMin * rounds + breakMin * Math.max(0, rounds - 1);
  
  // 백엔드 정책 기준 단일 세션 최대 감금 누적 상한인 10시간(600분) 한도를 초과하지 않도록 동적 맥스 리미트 한계 스펙 연산 수행
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
          <Text className="text-white/80 font-medium">진행 예정 시간</Text>
          <Text className="text-[#7c3aed] text-xl font-extrabold pr-1">{formatTime(totalMin)}</Text>
        </View>
      </View>
    </View>
  );
}