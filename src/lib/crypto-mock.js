const Crypto = require('expo-crypto');

module.exports = {
  getRandomValues: Crypto.getRandomValues,
  subtle: {},
  // 💡 Yjs(lib0)가 실행 시점에 찾으려 하는 함수들을 Mocking 합니다.
  ensureSecure: () => {}, 
  webcrypto: {
    getRandomValues: Crypto.getRandomValues,
    subtle: {},
  },
};