import { useEffect } from 'react';
import { BackHandler, NativeEventSubscription } from 'react-native';

export function usePreventBack(onBackPress?: () => void) {
  useEffect(() => {
    const handleBackPress = () => {
      if (onBackPress) {
        onBackPress();
      }
      return true; // true를 반환하면 기본 뒤로가기 동작을 막습니다.
    };

    const subscription: NativeEventSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    
    return () => {
      // 💡 이전의 removeEventListener 대신 subscription.remove()를 사용합니다.
      subscription.remove();
    };
  }, [onBackPress]);
}