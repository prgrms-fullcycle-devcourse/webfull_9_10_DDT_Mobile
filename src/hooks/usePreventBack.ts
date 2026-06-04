import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function usePreventBack(onBackPress?: () => void) {
  useEffect(() => {
    const handleBackPress = () => {
      if (onBackPress) {
        onBackPress();
      }
      return true; 
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [onBackPress]);
}