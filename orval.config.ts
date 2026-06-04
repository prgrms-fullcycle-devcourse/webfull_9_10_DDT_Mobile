// orval.config.ts
import { defineConfig } from 'orval';
import * as dotenv from 'dotenv';

// .env 파일의 환경변수를 불러오기 위함
dotenv.config();

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default defineConfig({
  ddt_api: {
    input: `${API_URL}/api/docs-json`, 
    output: {
      mode: 'tags-split', // API 태그(도메인)별로 파일 분리
      target: 'src/api/generated/api.ts', // API 호출 함수가 생성될 위치
      schemas: 'src/api/generated/models', // DTO(타입)가 생성될 위치
      client: 'axios', // Axios 클라이언트 사용
      // (선택) 자동으로 커스텀 axios 인스턴스를 주입하고 싶다면 아래 주석 해제
      // override: {
      //   mutator: {
      //     path: 'src/api/axiosClient.ts',
      //     name: 'default',
      //   },
      // },
    },
  },
});