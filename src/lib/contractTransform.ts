import type { Tier, Penalty, ContractFields } from '../hooks/useYjsContract';

export interface SavedRule {
  ruleId: string;
  title: string;
  focusMin: number;
  breakMin: number;
  rounds: number;
  penalties: { itemId: string; content: string }[];
  tierConfig: { tiers: Tier[] };
}

export interface ContractDataForSave {
  focusMin: number;
  breakMin: number;
  rounds: number;
  penalties: string[];
  tierConfig: { tiers: Tier[] };
}

/**
 * 프론트엔드의 Yjs 계약서 데이터 구조를 백엔드 API 요청 포맷(DTO)으로 변환합니다.
 * @param {ContractFields} fields - 타이머 설정 (집중, 휴식, 반복 횟수)
 * @param {Tier[]} tiers - 벌칙 단계 설정 배열
 * @param {Penalty[]} penalties - Yjs로 관리되는 벌칙 객체 배열
 * @returns {ContractDataForSave} 백엔드 저장 API에 전송할 수 있는 객체
 */
export function toBackendFormat(
  fields: ContractFields,
  tiers: Tier[],
  penalties: Penalty[],
): ContractDataForSave {
  return {
    focusMin: fields.focusMin,
    breakMin: fields.breakMin,
    rounds: fields.rounds,
    // 백엔드는 순수 문자열 배열로 벌칙 목록을 관리하므로 구조를 맵핑함
    penalties: penalties.map((p) => p.content),
    tierConfig: { tiers },
  };
}

/**
 * 백엔드에서 조회한 저장된 규칙 데이터를 프론트엔드의 Yjs 에디터에서 사용할 수 있는 구조로 변환합니다.
 * @param {SavedRule} rule - 백엔드에서 받아온 저장된 계약서 원본 데이터
 * @returns {Object} Yjs 문서에 병합할 수 있는 fields, tiers, penalties 객체
 */
export function toYjsFormat(rule: SavedRule): {
  fields: ContractFields;
  tiers: Tier[];
  penalties: Penalty[];
} {
  return {
    fields: {
      focusMin: rule.focusMin,
      breakMin: rule.breakMin,
      rounds: rule.rounds,
    },
    tiers: rule.tierConfig.tiers,
    penalties: rule.penalties.map((p) => ({
      id: p.itemId,
      content: p.content,
    })),
  };
}