// src/components/contract/PenaltySettings.tsx
import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Penalty } from '../../hooks/useYjsContract';

interface PenaltySettingsProps {
  penalties: Penalty[];
  addPenalty: (content: string) => void;
  updatePenalty: (index: number, content: string) => void;
  removePenalty: (index: number) => void;
  canEdit: boolean;
}

export default function PenaltySettings({
  penalties,
  addPenalty,
  updatePenalty,
  removePenalty,
  canEdit,
}: PenaltySettingsProps) {
  return (
    <View className="mb-6">
      <Text className="text-white/85 font-bold text-[15px] mb-3 ml-1">벌칙 목록</Text>
      <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-3">
        {penalties.map((p, i) => (
          <View key={p.id} className="flex-row items-center gap-2">
            <TextInput
              className={`flex-1 bg-[#1A1A2E] text-white px-4 h-12 rounded-xl border border-white/10 ${!canEdit ? 'opacity-50' : ''}`}
              placeholder="예: 팔굽혀펴기 10회"
              placeholderTextColor="#6B7280"
              value={p.content}
              onChangeText={(val) => updatePenalty(i, val)}
              editable={canEdit}
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
        ))}

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