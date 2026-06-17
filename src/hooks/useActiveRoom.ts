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
 * 진행 중인 방의 현재 상태(phase)를 판별하여 복귀해야 할 화면의 라우트 경로를 반환합니다.
 * @param {ActiveRoomDetail} room - 현재 참여 중인 활성 방의 상세 정보 객체
 * @returns {string} 클라이언트가 이동해야 할 상대 경로 (예: `/room/1234abcd/timer`)
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

/**
 * 현재 로그인한 사용자가 참여 중인(활성화된) 방의 상세 정보를 전역적으로 조회하고 관리합니다.
 * 활성 방이 없는 게스트 계정의 경우 토큰을 정리하는 부수 효과(Side Effect)를 포함합니다.
 * @returns {ActiveRoomDetail | null} 조회된 활성 방의 상세 정보 (없을 경우 null)
 */
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

  // 게스트 계정은 방 단위로 수명이 결정되므로, 참여 중인 방이 없다면 즉시 권한(토큰)을 회수하여 세션을 정리함
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