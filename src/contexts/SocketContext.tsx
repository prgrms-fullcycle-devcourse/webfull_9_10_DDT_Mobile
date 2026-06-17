import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { getToken } from '../lib/token';
import { useRoomStore, RoomMember } from '../store/useRoomStore';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ roomCode, children }: { roomCode: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState);
  const router = useRouter();

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

      s.on('room:state', (data: {
        hostId?: string;
        members?: Record<string, RoomMember>;
        phase?: string;
        [key: string]: any;
      }) => {
        const members = data.members ?? {};
        const hostId = data.hostId ?? Object.entries(members).find(([, m]) => m?.isHost)?.[0] ?? '';
        setRoomState({ hostId, members, phase: data.phase ?? 'contract' });
      });

      s.on('member:joined', (payload: { userId: string } & Partial<RoomMember>) => {
        const { userId, ...memberData } = payload;
        upsertMember(userId, memberData);
        if (memberData.isHost) {
          useRoomStore.setState({ hostId: userId });
        }
      });

      s.on('member:left', (payload: { userId: string }) => {
        removeMember(payload.userId);
      });

      s.on('member:kicked', (payload: { targetId: string }) => {
        removeMember(payload.targetId);
      });

      // 💡 본인이 강퇴되었을 때 홈으로 이동
      s.on('kicked', () => {
        Toast.show({ type: 'error', text1: '안내', text2: '방장에 의해 강퇴되었어요.' });
        router.replace('/');
      });

      s.on('sign:updated', (payload: { userId: string; signed: boolean }) => {
        upsertMember(payload.userId, { isSigned: payload.signed });
      });

      s.on('sign:reset', () => {
        useRoomStore.getState().resetAllSignatures();
      });

      s.on('edit:updated', (payload: { targetId: string; canEdit: boolean }) => {
        upsertMember(payload.targetId, { canEdit: payload.canEdit });
      });

      s.on('edit:all-updated', (payload: { canEdit: boolean }) => {
        useRoomStore.getState().updateAllNonHostsCanEdit(payload.canEdit);
      });

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

      s.on('session:ended', () => {
        useRoomStore.getState().setPhase('result');
        useRoomStore.getState().setSessionInfo(null);
      });

      s.on('member:gave-up', ({ userId, gaveUpAt }: { userId: string, gaveUpAt: string }) => {
        upsertMember(userId, { gaveUpAt });
      });

      s.on('escape:summary', ({ members }: { members: { identifier: string; totalEscapeMs: number }[] }) => {
        useRoomStore.getState().setEscapeSummary(members);
      });

      // 💡 방 폭파 시 홈으로 이동 및 스토어 리셋
      s.on('room:closed', (payload: { reason?: string }) => {
        Toast.show({ type: 'error', text1: '종료', text2: payload.reason ?? '방이 종료되었어요.' });
        useRoomStore.getState().reset();
        router.replace('/');
      });

      // 💡 서버에서 강제 접속 해제 시 예외 처리 완벽 이식
      s.on('force-disconnect', (data: { reason: string }) => {
        if (data.reason === 'not-a-member') {
          Toast.show({ type: 'error', text1: '방에 참여하지 않았어요.' });
          router.replace(`/room/${roomCode}`);
        } else if (data.reason === 'room-timer') {
          Toast.show({ type: 'error', text1: '이미 진행 중인 방이에요.' });
          router.replace('/');
        } else if (data.reason === 'room-closed') {
          Toast.show({ type: 'error', text1: '이미 종료된 방이에요.' });
          router.replace('/');
        } else if (data.reason === 'duplicate-connection') {
          Toast.show({ type: 'error', text1: '다른 기기에서 접속이 감지되었어요.' });
          s.io.opts.reconnection = false;
          router.replace('/');
        }
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