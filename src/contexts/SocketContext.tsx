import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native'; // 💡 AppState 임포트
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/token';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ roomCode, children }: { roomCode: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState); // 💡 현재 앱 상태 추적

  useEffect(() => {
    const connectSocket = async () => {
      if (socketRef.current?.connected) return;

      const token = await getToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.x:8080';

      const s = io(apiUrl, {
        auth: { token },
        query: { roomCode },
        transports: ['polling', 'websocket'],
        forceBase64: true,
      });

      s.on('connect', () => console.log('소켓 연결 성공:', s.id));
      s.on('connect_error', (err) => console.error('소켓 연결 에러:', err.message));

      socketRef.current = s;
      setSocket(s);
    };

    connectSocket();

    // 💡 백그라운드 전환 시 소켓 재연결 리스너
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('앱 복귀: 소켓 연결 상태 확인 중...');
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect(); // 수동으로 연결 재시도
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      console.log('소켓 해제');
      subscription.remove(); // 💡 앱 상태 리스너 해제
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomCode]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);