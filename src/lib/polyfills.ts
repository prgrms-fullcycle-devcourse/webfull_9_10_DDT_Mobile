// src/lib/polyfills.ts
import 'react-native-get-random-values'; // uuid 및 yjs crypto를 위한 난수 생성기
import 'react-native-url-polyfill/auto'; // y-websocket에서 사용하는 URL 객체 폴리필

// Yjs가 필수로 요구하는 TextEncoder / TextDecoder 폴리필
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}