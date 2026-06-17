import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

/**
 * 발급 완료된 사용자 인가 JWT 토큰을 OS 자체 보안 샌드박스 스토리지에 암호화하여 기록합니다.
 * @param {string} token - 디스크에 보관할 유효한 Bearer JWT 스트링
 * @returns {Promise<void>} 비동기 기록 완료 프로세스 프로미스
 */
export const setToken = async (token: string) => {
  // 모바일 탈옥 및 루팅 환경에서의 JWT 하이재킹 위험을 원천 방어하기 위해 일반 파일 스토리지 대신 커널 암호화 보안 스토리지 영구 할당
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

/**
 * 로컬 보안 키체인 저장소로부터 저장된 인가 JWT 토큰을 비동기식으로 탐색하여 복호화 로드합니다.
 * @returns {Promise<string | null>} 복호화 완료된 JWT 문자열 (미인증 상태일 경우 null)
 */
export const getToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

/**
 * 로컬 기기 내 보안 저장소에 기록된 사용자 토큰 데이터를 일방향으로 파쇄하여 무효화(로그아웃) 처리합니다.
 * @returns {Promise<void>} 파쇄 완료 프로세스 프로미스
 */
export const removeToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};