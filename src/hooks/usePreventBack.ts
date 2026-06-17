import { useEffect } from 'react';
import { BackHandler, NativeEventSubscription } from 'react-native';

/**
 * 안드로이드 하드웨어 뒤로가기 버튼의 기본 동작을 차단하고 커스텀 콜백을 실행합니다.
 * 결제, 결과 화면, 진행 중인 타이머 등 이탈을 방지해야 하는 화면에서 사용합니다.
 * @param {() => void} [onBackPress] - 뒤로가기 버튼 클릭 시 실행할 커스텀 콜백 함수
 */
export function usePreventBack(onBackPress?: () => void) {
  useEffect(() => {
    const handleBackPress = () => {
      if (onBackPress) {
        onBackPress();
      }
      // true를 반환해야 시스템 기본 동작(앱 종료 또는 이전 화면 이동)이 실행되지 않음
      return true;
    };

    const subscription: NativeEventSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    
    return () => {
      subscription.remove();
    };
  }, [onBackPress]);
}