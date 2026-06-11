import { create } from 'zustand';

// ... (기존 인터페이스들은 그대로 유지) ...
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
  
  // 💡 반복문 덮어쓰기 버그 방지용 일괄 업데이트 함수 추가
  updateAllNonHostsCanEdit: (canEdit: boolean) => void;
  resetAllSignatures: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  hostId: null,
  members: {},
  phase: null,
  sessionInfo: null,
  escapeSummary: [],

  setState: (data) => set(data),
  setPhase: (phase) => set({ phase }),

  upsertMember: (userId, member) =>
    set((s) => ({
      members: {
        ...s.members,
        [userId]: { ...s.members[userId], ...member } as RoomMember,
      },
    })),
  removeMember: (userId) =>
    set((s) => {
      const next = { ...s.members };
      delete next[userId];
      return { members: next };
    }),
    
  reset: () => set({ hostId: null, members: {}, phase: null, sessionInfo: null, escapeSummary: [] }),
  setSessionInfo: (info) => set({ sessionInfo: info }),
  setEscapeSummary: (summary) => set({ escapeSummary: summary }),

  // 💡 방장 외 인원 편집 권한 일괄 변경
  updateAllNonHostsCanEdit: (canEdit) =>
    set((s) => {
      const next = { ...s.members };
      Object.keys(next).forEach((uid) => {
        if (!next[uid].isHost) {
          next[uid] = { ...next[uid], canEdit };
        }
      });
      return { members: next };
    }),

  // 💡 계약서 서명 일괄 초기화
  resetAllSignatures: () =>
    set((s) => {
      const next = { ...s.members };
      Object.keys(next).forEach((uid) => {
        next[uid] = { ...next[uid], isSigned: false };
      });
      return { members: next };
    }),
}));