// src/store/useAuthStore.ts
import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { getToken, removeToken } from '../lib/token';
import { getUsers } from '../api/generated/users-사용자/users-사용자';
import axiosClient from '../api/axiosClient';

interface JwtPayload {
  sub: string;
  role: string;
  exp?: number;
}

interface Me {
  id: string;
  nickname: string;
  profileImage: string;
  role: 'user' | 'guest';
}

interface AuthState {
  isLoggedIn: boolean;
  me: Me | null;
  setMe: (me: Me) => void;
  fetchMe: () => Promise<void>;
  checkLoginStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  me: null,

  setMe: (me) => set({ me, isLoggedIn: true }),

  fetchMe: async () => {
    const token = await getToken();

    if (!token) {
      set({ isLoggedIn: false, me: null });
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwtDecode<JwtPayload>(token);
    } catch {
      set({ isLoggedIn: false, me: null });
      return;
    }

    // 게스트 처리
    if (payload.role === 'guest') {
      set({
        me: {
          id: payload.sub,
          nickname: '게스트',
          profileImage: 'basic_image_key_01',
          role: 'guest',
        },
        isLoggedIn: true,
      });
      return;
    }

    // 일반 회원 처리 (Orval로 생성된 API + AxiosClient 주입)
    try {
      const res = await getUsers(axiosClient).usersControllerGetMe();
      // 백엔드 응답이 { message, data: {...} } 형태이므로 axiosClient 인터셉터에서 data를 한 번 벗겨줌
      const data = res.data as unknown as {
        userId: string;
        nickname: string;
        email: string;
        profileImage: string;
      };
      
      set({
        me: {
          id: data.userId,
          nickname: data.nickname,
          profileImage: data.profileImage,
          role: 'user',
        },
        isLoggedIn: true,
      });
    } catch (_error) {
      set({ isLoggedIn: false, me: null });
    }
  },

  checkLoginStatus: async () => {
    const token = await getToken();
    set((state) => ({
      isLoggedIn: !!token,
      me: token ? state.me : null,
    }));
    return !!token;
  },

  logout: async () => {
    await removeToken();
    set({ isLoggedIn: false, me: null });
  },
}));