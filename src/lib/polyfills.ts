import * as Crypto from 'expo-crypto';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

// React Native(JavaScriptCore/Hermes) 런타임 환경에 존재하지 않는 Node.js 및 Web 표준 API들을 글로벌 스코프에 주입하여, Yjs 및 외부 암호화 라이브러리의 의존성 크래시를 방지함
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.crypto !== 'object') {
  global.crypto = {} as any;
}
if (typeof global.crypto.getRandomValues !== 'function') {
  // Expo 환경에서 안전한 난수 생성을 보장하기 위해 고성능 네이티브 모듈인 expo-crypto 바인딩
  global.crypto.getRandomValues = Crypto.getRandomValues as any;
}

if (typeof global.TextEncoder === 'undefined') {
  // 실시간 바이너리 데이터(Yjs Update 패킷) 스트림 파싱에 필요한 엔코더 규격 강제 보완
  const { TextEncoder, TextDecoder } = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}