import { create } from 'zustand';

export interface RoomMember {
  userId: string;
  nickname: string;
  profileImage: string;
  isHost: boolean;
  isLoggedIn: boolean;
  connected: boolean;
  socketId?: string;
  isSigned?: boolean;
  canEdit?: boolean;
  gaveUpAt?: string | null;
}

export interface EscapeSummaryItem {
  identifier: string;
  totalEscapeMs: number;
}

export interface SessionInfo {
  startedAt: number;
  focusMin: number;
  breakMin: number;
  totalRounds: number;
  serverOffset: number;
}

interface RoomStore {
  hostId: string | null;
  members: Record<string, RoomMember>;
  phase: string | null;
  sessionInfo: SessionInfo | null;
  escapeSummary: EscapeSummaryItem[];

  setState: (data: {
    hostId: string;
    members: Record<string, RoomMember>;
    phase: string;
  }) => void;
  setPhase: (phase: string) => void;
  upsertMember: (userId: string, member: Partial<RoomMember>) => void;
  removeMember: (userId: string) => void;
  reset: () => void;
  setSessionInfo: (info: SessionInfo | null) => void;
  setEscapeSummary: (summary: EscapeSummaryItem[]) => void;
  updateAllNonHostsCanEdit: (canEdit: boolean) => void;
  resetAllSignatures: () => void;
}

/**
 * 실시간 스터디 룸의 수명 주기(페이즈 전환, 접속 멤버 명부, 서명 동향, 이탈 합산 현황)를 소켓 스트림과 연동하는 데이터 허브 스토어입니다.
 * @returns {RoomStore} 방 내부 세션 동기화 전용 스토어 인스턴스
 */
export const useRoomStore = create<RoomStore>((set) => ({
  hostId: null,
  members: {},
  phase: null,
  sessionInfo: null,
  escapeSummary: [],

  setState: (data) => set(data),
  setPhase: (phase) => set({ phase }),

  /**
   * 특정 유저의 가변 프로퍼티(준비 서명 완료, 온라인 오프라인 상태 전환 등)를 타겟팅하여 부분 업데이트(Merge)합니다.
   * @param {string} userId - 상태를 갱신할 타겟 멤버 식별자
   * @param {Partial<RoomMember>} member - 덮어쓸 신규 멤버 데이터 속성 정보
   */
  upsertMember: (userId, member) =>
    set((s) => ({
      members: {
        ...s.members,
        [userId]: { ...s.members[userId], ...member } as RoomMember,
      },
    })),

  /**
   * 방을 퇴장하거나 추방당한 인원을 활성 스터디원 명부 딕셔너리에서 즉각 완전히 제외합니다.
   * @param {string} userId - 추방 혹은 탈퇴한 대상 유저 고유 ID
   */
  removeMember: (userId) =>
    set((s) => {
      const next = { ...s.members };
      delete next[userId];
      return { members: next };
    }),
    
  reset: () => set({ hostId: null, members: {}, phase: null, sessionInfo: null, escapeSummary: [] }),
  setSessionInfo: (info) => set({ sessionInfo: info }),
  setEscapeSummary: (summary) => set({ escapeSummary: summary }),

  /**
   * 방장이 계약서 권한 스위치를 토글할 때, 방장을 제외한 모든 일반 참여자들의 실시간 계약서 양식 수정 편집 권한을 일괄 제어합니다.
   * @param {boolean} canEdit - 부여할 수정 권한 가부 상태값
   */
  updateAllNonHostsCanEdit: (canEdit) =>
    set((s) => {
      const next = { ...s.members };
      // 방 내부 동시 다발적 맵 순회 시, 이전 오브젝트 참조가 꼬여 편집 플래그가 누락 및 튕기는 레이스 컨디션을 막기 위해 완전히 복사된 레퍼런스로 루프 실행
      Object.keys(next).forEach((uid) => {
        if (!next[uid].isHost) {
          next[uid] = { ...next[uid], canEdit };
        }
      });
      return { members: next };
    }),

  /**
   * 계약 조건(집중 시간, 라운드 등)이 대폭 수정되었을 때, 기존 서명 대기 인원들의 서명 합의 상태를 전원 false로 강제 일괄 되돌림 처리합니다.
   */
  resetAllSignatures: () =>
    set((s) => {
      const next = { ...s.members };
      Object.keys(next).forEach((uid) => {
        next[uid] = { ...next[uid], isSigned: false };
      });
      return { members: next };
    }),
}));