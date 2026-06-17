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

/**
 * 앱 전체의 사용자 인증 상태(로그인 여부, 내 정보 정보 및 게스트 권한)를 중앙 집약적으로 관리하는 상태 관리 스토어입니다.
 * @returns {AuthState} 인증 세션 제어 상태 및 액션 메서드 집합
 */
export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  me: null,

  setMe: (me) => set({ me, isLoggedIn: true }),

  /**
   * 보안 저장소에 보관된 JWT 토큰을 해독하고 사용자 프로필 API를 호출하여 최신 세션 정보를 동기화합니다.
   * 토큰 내 고유 role 정보가 'guest'일 경우 원격 서버 호출 없이 로컬 세션을 가상 할당합니다.
   */
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

    // 게스트 계정은 서버 DB에 고유 식별 레코드가 상주하지 않으므로, JWT sub(토큰 발행 대상자 식별값)를 가상 ID로 채택하여 내부 샌드박스 생성
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

    // 정식 일반 회원 정보는 가변 프로필 데이터 조회를 위해 최신 오발 백엔드 명세 래퍼 함수를 가동하여 최신화
    try {
      const res = await getUsers(axiosClient).usersControllerGetMe();
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

  /**
   * 로컬 디스크 내 암호화 토큰 적재 상태만을 고속 검증하여 로그인 유효 상태를 부울값으로 선제 판별합니다.
   * @returns {Promise<boolean>} 로그인 토큰 실존 여부
   */
  checkLoginStatus: async () => {
    const token = await getToken();
    set((state) => ({
      isLoggedIn: !!token,
      me: token ? state.me : null,
    }));
    return !!token;
  },

  /**
   * 로컬 기기에 저장된 인가 토큰 권한을 안전하게 파쇄하고 인메모리 세션 스토어를 무인증 기본 상태로 초기화합니다.
   */
  logout: async () => {
    await removeToken();
    set({ isLoggedIn: false, me: null });
  },
}));