import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/token';
import { useRoomStore, RoomMember } from '../store/useRoomStore';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ roomCode, children }: { roomCode: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState);

  const setRoomState = useRoomStore((s) => s.setState);
  const upsertMember = useRoomStore((s) => s.upsertMember);
  const removeMember = useRoomStore((s) => s.removeMember);
  const resetRoom = useRoomStore((s) => s.reset);

  useEffect(() => {
    const connectSocket = async () => {
      if (socketRef.current?.connected) return;

      const token = await getToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.x:8080';

      const s = io(apiUrl, {
        auth: { token },
        query: { roomCode },
        transports: ['websocket'],
        forceBase64: true,
      });

      s.on('connect', () => console.log('소켓 연결 성공:', s.id));
      s.on('connect_error', (err) => console.error('소켓 연결 에러:', err.message));

      // 임시 디버깅 — 안정화되면 지워도 됩니다
      s.onAny((evt, ...args) => {
        console.log('[SOCKET RECV]', evt, JSON.stringify(args).slice(0, 300));
      });

      // === 입장 시 전체 룸 스냅샷 ===
      s.on('room:state', (data: {
        hostId?: string;
        members?: Record<string, RoomMember>;
        phase?: string;
        [key: string]: any;
      }) => {
        const members = data.members ?? {};
        // hostId가 top-level에 없으면 members에서 isHost로 derive
        const hostId =
          data.hostId ??
          Object.entries(members).find(([, m]) => m?.isHost)?.[0] ??
          '';
        setRoomState({
          hostId,
          members,
          phase: data.phase ?? 'contract',
        });
      });

      // === 다른 멤버가 입장 (flat spread!) ===
      s.on('member:joined', (payload: { userId: string } & Partial<RoomMember>) => {
        const { userId, ...memberData } = payload;
        upsertMember(userId, memberData);
        if (memberData.isHost) {
          useRoomStore.setState({ hostId: userId });
        }
      });

      // === 멤버 나감 ===
      s.on('member:left', (payload: { userId: string }) => {
        removeMember(payload.userId);
      });

      // === 누군가 강퇴됨 (targetId 사용!) ===
      s.on('member:kicked', (payload: { targetId: string }) => {
        removeMember(payload.targetId);
      });

      // === 본인이 강퇴됨 ===
      s.on('kicked', () => {
        console.warn('본인 강퇴 알림 수신');
        // 필요하면 여기서 router.replace('/') 호출. 현재는 force-disconnect로 끊김 처리됨.
      });

      // === 서명 상태 변경 ===
      s.on('sign:updated', (payload: {
        userId: string;
        signed: boolean;
        signedCount: number;
        totalCount: number;
        allSigned: boolean;
      }) => {
        upsertMember(payload.userId, { isSigned: payload.signed });
      });

      // === 계약서 편집되어 모든 서명 리셋 ===
      s.on('sign:reset', () => {
        const cur = useRoomStore.getState().members;
        Object.keys(cur).forEach((uid) => {
          upsertMember(uid, { isSigned: false });
        });
      });

      // === 개별 멤버 편집권한 변경 ===
      s.on('edit:updated', (payload: { targetId: string; canEdit: boolean }) => {
        upsertMember(payload.targetId, { canEdit: payload.canEdit });
      });

      // === 전체 편집권한 토글 ===
      s.on('edit:all-updated', (payload: { canEdit: boolean }) => {
        const cur = useRoomStore.getState().members;
        Object.entries(cur).forEach(([uid, m]) => {
          if (!m.isHost) upsertMember(uid, { canEdit: payload.canEdit });
        });
      });

      // 💡 여기서부터 새롭게 추가된 부분입니다!
      // === 타이머 세션 시작 ===
      s.on('session:started', (data: {
        startedAt: string;
        focusMin: number;
        breakMin: number;
        totalRounds: number;
        serverTime: string;
      }) => {
        const clientNow = Date.now();
        const serverNow = new Date(data.serverTime).getTime();

        useRoomStore.getState().setPhase('timer');
        useRoomStore.getState().setSessionInfo({
          startedAt: new Date(data.startedAt).getTime(),
          focusMin: data.focusMin,
          breakMin: data.breakMin,
          totalRounds: data.totalRounds,
          serverOffset: serverNow - clientNow,
        });
      });

      // === 타이머 세션 종료 ===
      s.on('session:ended', () => {
        useRoomStore.getState().setPhase('result');
        useRoomStore.getState().setSessionInfo(null);
      });

      // === 중도 포기 ===
      s.on('member:gave-up', ({ userId, gaveUpAt }: { userId: string, gaveUpAt: string }) => {
        upsertMember(userId, { gaveUpAt });
      });

      // === 이탈 요약 정보 수신 ===
      s.on('escape:summary', ({ members }: { members: { identifier: string; totalEscapeMs: number }[] }) => {
        useRoomStore.getState().setEscapeSummary(members);
      });
      // 💡 추가 끝!

      // === 방 종료 ===
      s.on('room:closed', (payload: { reason: string }) => {
        console.warn('방 종료:', payload.reason);
      });

      // === 서버가 강제로 끊을 때 ===
      s.on('force-disconnect', (payload: { reason: string }) => {
        console.warn('Force disconnect:', payload.reason);
      });

      socketRef.current = s;
      setSocket(s);
    };

    connectSocket();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      socketRef.current?.disconnect();
      socketRef.current = null;
      resetRoom();
    };
  }, [roomCode]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);