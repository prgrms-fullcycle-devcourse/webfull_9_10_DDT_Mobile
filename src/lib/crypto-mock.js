const Crypto = require('expo-crypto');

// Yjs의 하부 유틸리티 라이브러리인 lib0/crypto가 초기화 시점에 브라우저 내장 웹 암호화 표준(webcrypto)을 강제로 탐색하므로, 실행 시점 에러를 방지하기 위해 네이티브 모듈 기반으로 목킹 구조를 형성함
module.exports = {
  getRandomValues: Crypto.getRandomValues,
  subtle: {},
  ensureSecure: () => {}, 
  webcrypto: {
    getRandomValues: Crypto.getRandomValues,
    subtle: {},
  },
};