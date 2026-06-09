import * as Crypto from 'expo-crypto';
import 'react-native-url-polyfill/auto'; // URL 폴리필

// 1. 전역 crypto 폴리필 (안전한 expo-crypto 사용)
if (typeof global.crypto !== 'object') {
  global.crypto = {} as any;
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = Crypto.getRandomValues as any;
}

// 2. Yjs를 위한 TextEncoder / TextDecoder 폴리필
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}