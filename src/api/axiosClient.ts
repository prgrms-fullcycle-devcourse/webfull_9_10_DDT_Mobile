import axios from 'axios';
import { getToken } from '../lib/token';

/**
 * 환경 변수에 정의된 기본 API URL을 기반으로 인증 토큰 주입 및 응답 데이터 가공을 수행하는 글로벌 Axios 클라이언트 인스턴스입니다.
 */
const axiosClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// 모든 API 요청 송신 직전, 보안 키체인 스토리지로부터 최신 JWT 액세스 토큰을 비동기로 조회하여 Authorization 헤더에 Bearer 규격으로 자동 주입
axiosClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 백엔드 API 디자인 스펙상 모든 정상 응답이 { message: string, data: T } 래퍼 구조로 반환되므로, 웹 프로젝트와의 호환성 및 클라이언트 코드의 간결함을 위해 인터셉터 단계에서 data.data 구조를 한 꺼풀 벗겨내어 전달
axiosClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

export default axiosClient;