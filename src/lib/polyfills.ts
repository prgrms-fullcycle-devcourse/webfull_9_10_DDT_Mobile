import * as Crypto from 'expo-crypto';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.crypto !== 'object') {
  global.crypto = {} as any;
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = Crypto.getRandomValues as any;
}

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}