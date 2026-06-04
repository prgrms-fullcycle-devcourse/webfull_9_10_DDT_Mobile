// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/token';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ roomCode, children }: { roomCode: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connectSocket = async () => {
      if (socketRef.current?.connected) return;

      const token = await getToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.x:8080';

      const s = io(apiUrl, {
        auth: { token },
        query: { roomCode },
        transports: ['polling', 'websocket'],
      });

      s.on('connect', () => console.log('소켓 연결 성공:', s.id));
      s.on('connect_error', (err) => console.error('소켓 연결 에러:', err.message));

      socketRef.current = s;
      setSocket(s);
    };

    connectSocket();

    return () => {
      console.log('소켓 해제');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomCode]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);