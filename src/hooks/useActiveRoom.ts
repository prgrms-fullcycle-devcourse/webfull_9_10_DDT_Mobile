// src/hooks/useActiveRoom.ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoomApi } from '../api/generated/room-api/room-api';
import { useAuthStore } from '../store/useAuthStore';
import { removeToken } from '../lib/token';
import axiosClient from '../api/axiosClient';

export interface ActiveRoomSummary {
  code: string;
  title: string;
  phase: string;
}

export interface ActiveRoomDetail {
  id: string;
  title: string;
  memberCount: number;
  phase: string;
  isHost: boolean;
}

/**
 * 진행 중인 방으로 복귀할 때 phase에 따라 이동할 경로를 반환합니다.
 */
export function getActiveRoomPath(room: ActiveRoomDetail): string {
  switch (room.phase) {
    case 'timer':
      return `/room/${room.id}/timer`;
    case 'contract':
      return `/room/${room.id}/contract`;
    case 'result':
      return `/room/${room.id}/semi-result`;
    case 'lobby':
    default:
      return `/room/${room.id}`;
  }
}

export function useActiveRoom(): ActiveRoomDetail | null {
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const me = useAuthStore((s) => s.me);

  const {
    data: activeRoom,
    isError: isActiveRoomError,
    isFetched: isActiveRoomFetched,
  } = useQuery({
    queryKey: ['room', 'active', isLoggedIn],
    queryFn: async () => {
      const res = await getRoomApi(axiosClient).roomControllerGetMyActiveRoom();
      return (res.data as unknown as ActiveRoomSummary) || null;
    },
    enabled: isLoggedIn,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const activeCode = activeRoom?.code;

  const { data: roomDetail } = useQuery({
    queryKey: ['room', 'active-detail', activeCode],
    queryFn: async () => {
      const res = await getRoomApi(axiosClient).roomControllerFindById(activeCode!);
      return res.data as unknown as ActiveRoomDetail;
    },
    enabled: !!activeCode,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  // 게스트인데 활성 방이 없으면 게스트 토큰을 정리한다.
  useEffect(() => {
    if (me?.role !== 'guest' || !isActiveRoomFetched) {
      return;
    }
    if (isActiveRoomError || !activeRoom) {
      removeToken().then(() => {
        useAuthStore.setState({ isLoggedIn: false, me: null });
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      });
    }
  }, [activeRoom, isActiveRoomError, isActiveRoomFetched, me?.role, queryClient]);

  return roomDetail ?? null;
}