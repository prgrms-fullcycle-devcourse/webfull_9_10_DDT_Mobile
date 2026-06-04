// src/api/axiosClient.ts
import axios from 'axios';
import { getToken } from '../lib/token';

const axiosClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// 요청을 보내기 전에 토큰을 헤더에 삽입
axiosClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 데이터를 웹 프로젝트와 동일하게 data.data 로 벗겨내기
axiosClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

export default axiosClient;