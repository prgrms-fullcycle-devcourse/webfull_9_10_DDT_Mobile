import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { getToken } from '../lib/token';
import { useRoomStore, RoomMember } from '../store/useRoomStore';

const SocketContext = createContext<Socket | null>(null);

/**
 * 방 참여 시점에 타겟 룸 채널 소켓 파이프라인을 독점적으로 개설하고, 실시간으로 하달되는 분산 이벤트 프로토콜 메시지 스트림을 청취 및 스토어에 바인딩합니다.
 * @param {Object} props - 소켓 공급 바인딩 인터페이스 객체
 * @param {string} props.roomCode - 커넥션을 체결할 대상 고유 룸 방 번호
 * @param {React.ReactNode} props.children - 하위 라우터 라인 트리 노드
 * @returns {JSX.Element} 실시간 웹소켓 이벤트 터널링 공급 영역 인스턴스
 */
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
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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

      // 방장이 대기방 컴포넌트 목록에서 나를 지정해 Kick 명령을 서버로 브로드캐스트했을 때 네이티브 토스트 알림과 함께 즉시 메인 대시보드로 격리 수송
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
          // 클라이언트 기기 시간 오차로 인해 남은 타이머 시간 연산이 어긋나는 버그를 차단하고자 서버 타임 스탬프 오프셋 보정 레이어 장착
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

      s.on('room:closed', (payload: { reason?: string }) => {
        Toast.show({ type: 'error', text1: '종료', text2: payload.reason ?? '방이 종료되었어요.' });
        useRoomStore.getState().reset();
        router.replace('/');
      });

      // 방 입장 실패 조건(이미 인원이 꽉 차 잠김, 비합리적 접근 토큰 등)에 수렴하여 소켓이 유실된 시점에 사유에 맞춰 유저 가이드 팝업 피드백 출력
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

    // 모바일 OS 라이프사이클 정책에 의해 백그라운드 홀딩 상태로 내려갔다가 포그라운드로 완전 복귀(Wake)하는 타이밍을 캐치하여 끊어진 소켓 세션 복구 재연결 시도
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

/**
 * 활성화된 소켓 통신 파이프라인 인스턴스를 서브 컴포넌트 영역에서 자유롭게 가져와 실시간 수동 데이터 Emit 처리를 수행하게 돕습니다.
 * @returns {Socket | null} 실시간 Socket.io 소켓 오브젝트 참조 정보
 */
export const useSocket = () => useContext(SocketContext);