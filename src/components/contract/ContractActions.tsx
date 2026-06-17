import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Alert, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { getRuleApi } from '../../api/generated/rule-api-계약서-관리/rule-api-계약서-관리';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';
import { UseContractYjsReturn } from '../../hooks/useYjsContract';
import { toBackendFormat, toYjsFormat, SavedRule } from '../../lib/contractTransform';
import { Button } from '../ui/Button';

interface ContractActionsProps {
  fields: UseContractYjsReturn['fields'];
  tiers: UseContractYjsReturn['tiers'];
  penalties: UseContractYjsReturn['penalties'];
  applyAll: UseContractYjsReturn['applyAll'];
}

/**
 * 계약서 화면 상단에서 현재 작성 중인 규칙(타이머, 벌칙, 티어)을 템플릿으로 보관함에 저장하거나, 기존에 저장된 템플릿 목록을 조회하여 덮어쓰는 액션 컴포넌트입니다.
 * @param {ContractActionsProps} props - Yjs 실시간 문서 제어 상태 및 메서드 집합
 * @returns {JSX.Element | null} 일반 회원에게만 노출되는 저장/불러오기 버튼 및 모달 UI
 */
export function ContractActions({ fields, tiers, penalties, applyAll }: ContractActionsProps) {
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.me);
  const members = useRoomStore((state) => state.members);

  const myMember = me ? members[me.id] : undefined;
  const canEdit = myMember?.canEdit ?? false;
  const isGuest = me?.role === 'guest';

  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [title, setTitle] = useState('');

  // 템플릿 목록 저장 및 불러오기 모달이 실제로 활성화되었을 때만 불필요한 네트워크 트래픽을 방지하기 위해 쿼리 인에이블 제어 수행
  const { data: savedList, isLoading: isListLoading } = useQuery({
    queryKey: ['saved-rules'],
    queryFn: async () => {
      const res = await getRuleApi(axiosClient).ruleControllerGetSavedRules();
      return res.data as unknown as SavedRule[];
    },
    enabled: loadOpen || saveOpen, 
  });

  const saveMutation = useMutation({
    mutationFn: async (payloadTitle: string) => {
      const payload = toBackendFormat(fields, tiers, penalties);
      const existing = savedList?.find((r) => r.title === payloadTitle);

      // 사용자가 입력한 제목과 동일한 명칭의 템플릿이 보관함에 이미 실상주하는 경우, 신규 생성 대신 덮어쓰기(PUT) 엔드포인트로 유연하게 우회 전환
      if (existing) {
        return getRuleApi(axiosClient).ruleControllerUpdateRuleTemplate(existing.ruleId, {
          title: payloadTitle,
          ...payload,
        });
      } else {
        return getRuleApi(axiosClient).ruleControllerSaveRuleTemplate({
          title: payloadTitle,
          ...payload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-rules'] });
      Alert.alert('성공', '계약서가 저장되었습니다.');
      setSaveOpen(false);
      setTitle('');
    },
    onError: () => {
      Alert.alert('오류', '계약서 저장에 실패했습니다.');
    },
  });

  const handleSave = () => {
    if (!title.trim()) return;
    saveMutation.mutate(title.trim());
  };

  const handleLoad = (selectedRule: SavedRule) => {
    Alert.alert(
      '불러오기',
      `"${selectedRule.title}" 계약서를 덮어쓰시겠습니까?\n현재 작성 중인 내용은 사라집니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            const yjsData = toYjsFormat(selectedRule);
            // 원격 보관함에서 수신한 규칙 데이터를 CRDT 트랜잭션 단위로 묶어 실시간 참여자 화면에 원자적으로 일괄 주입 및 갱신
            applyAll({
              fields: yjsData.fields,
              tiers: yjsData.tiers,
              penalties: yjsData.penalties,
              penaltyMode: 'replace',
            });
            setLoadOpen(false);
            Alert.alert('성공', '계약서를 불러왔습니다.');
          },
        },
      ]
    );
  };

  // 게스트 계정은 마이페이지 및 개인 보관함 개념이 원천 부재하므로 상단 액션 바 렌더링 스킵
  if (!me || isGuest) return null;

  return (
    <View className="flex-row gap-2">
      <Pressable onPress={() => setSaveOpen(true)} className="border border-white/20 px-3 py-1.5 rounded-lg justify-center">
        <Text className="text-white/80 text-sm font-bold">저장</Text>
      </Pressable>

      {canEdit && (
        <Pressable onPress={() => setLoadOpen(true)} className="border border-white/20 px-3 py-1.5 rounded-lg justify-center bg-white/5">
          <Text className="text-white/80 text-sm font-bold">불러오기</Text>
        </Pressable>
      )}

      <Modal visible={saveOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-[#1E2538] p-6 rounded-3xl gap-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-white text-lg font-bold">계약서 저장</Text>
              <Pressable onPress={() => setSaveOpen(false)}>
                <X color="white" size={24} />
              </Pressable>
            </View>
            <TextInput
              className="bg-[#111827] text-white px-4 h-14 rounded-2xl border border-white/10"
              placeholder="저장할 계약서 이름을 입력하세요"
              placeholderTextColor="#6B7280"
              value={title}
              onChangeText={setTitle}
            />
            <Button
              title="저장하기"
              disabled={!title.trim() || saveMutation.isPending}
              isLoading={saveMutation.isPending}
              onPress={handleSave}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={loadOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#1E2538] h-[70%] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">저장된 계약서</Text>
              <Pressable onPress={() => setLoadOpen(false)}>
                <X color="white" size={24} />
              </Pressable>
            </View>
            {isListLoading ? (
              <ActivityIndicator color="#7c3aed" className="mt-10" />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {savedList && savedList.length > 0 ? (
                  savedList.map((item) => (
                    <Pressable
                      key={item.ruleId}
                      onPress={() => handleLoad(item)}
                      className="bg-[#111827] border border-white/10 p-4 rounded-2xl mb-3"
                    >
                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text className="text-white font-bold text-base mb-1">{item.title}</Text>
                          <Text className="text-white/50 text-xs">
                            집중 {item.focusMin}분 · 휴식 {item.breakMin}분 · {item.rounds}회 · 벌칙 {item.penalties.length}개
                          </Text>
                        </View>
                        <View className="bg-[#7c3aed]/20 px-3 py-1.5 rounded-full">
                          <Text className="text-[#7c3aed] text-xs font-bold">가져오기</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-white/50 text-center mt-10">저장된 계약서가 없습니다.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}