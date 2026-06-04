// src/components/contract/TierSettings.tsx
import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Tier } from '../../hooks/useYjsContract';

interface TierSettingsProps {
  tiers: Tier[];
  addTier: () => void;
  updateTier: (index: number, updated: Partial<Tier>) => void;
  removeTier: (index: number) => void;
  canEdit: boolean;
}

export default function TierSettings({
  tiers,
  addTier,
  updateTier,
  removeTier,
  canEdit,
}: TierSettingsProps) {
  const canAddTier = (() => {
    if (!canEdit) return false;
    if (tiers.length === 0) return true;
    const last = tiers[tiers.length - 1];
    if (tiers.length === 1) return last.maxPct !== null && last.maxPct > 0 && last.maxPct < 99;
    return last.minPct < 99;
  })();

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3 ml-1 pr-1">
        <Text className="text-white/85 font-bold text-[15px]">벌칙 강도</Text>
      </View>
      <View className="bg-[#111827] border border-white/10 rounded-2xl p-4 gap-4">
        {tiers.map((tier, i) => (
          <View key={tier.tier} className="gap-2">
            <View className="bg-[#7c3aed] self-start px-2.5 py-1 rounded-md mb-1">
              <Text className="text-white text-xs font-bold">{tier.tier}단계</Text>
            </View>
            <View className="flex-row items-center justify-between bg-[#1A1A2E] p-3 rounded-xl border border-white/10">
              <View className="flex-row items-center flex-1">
                <Text className="text-white/80 text-sm w-12">{tier.minPct}% ~</Text>
                <TextInput
                  className={`bg-white/5 text-white text-center h-10 w-16 rounded-lg ml-2 ${!canEdit ? 'opacity-50' : ''}`}
                  keyboardType="number-pad"
                  value={tier.maxPct !== null ? String(tier.maxPct) : ''}
                  placeholder="Max"
                  placeholderTextColor="#6B7280"
                  editable={canEdit && i !== tiers.length - 1}
                  onChangeText={(val) => {
                    const newMaxPct = val === '' ? 0 : Number(val);
                    if (newMaxPct < 0 || newMaxPct > 100) return;
                    if (i > 0 && newMaxPct <= tiers[i - 1].minPct) return;
                    updateTier(i, { maxPct: newMaxPct });
                    if (i + 1 < tiers.length) {
                      updateTier(i + 1, { minPct: newMaxPct });
                    }
                  }}
                />
                <Text className="text-white/50 text-sm ml-1">%</Text>
              </View>

              <View className="flex-row items-center ml-2 border-l border-white/10 pl-3">
                <Text className="text-white/80 text-sm">벌칙</Text>
                <TextInput
                  className={`bg-white/5 text-white text-center h-10 w-12 rounded-lg mx-2 ${!canEdit ? 'opacity-50' : ''}`}
                  keyboardType="number-pad"
                  value={String(tier.count)}
                  editable={canEdit}
                  onChangeText={(val) => updateTier(i, { count: Number(val) || 0 })}
                />
                <Text className="text-white/50 text-sm mr-2">개</Text>
                {canEdit && tiers.length > 1 && i !== 0 && (
                  <Pressable onPress={() => removeTier(i)} className="p-1">
                    <X color="#F85A5A" size={18} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ))}

        {canEdit && (
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
        )}
      </View>
    </View>
  );
}