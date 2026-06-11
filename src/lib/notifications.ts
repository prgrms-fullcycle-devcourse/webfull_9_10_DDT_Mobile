import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // 💡 변경됨
    shouldShowList: true,   // 💡 변경됨
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getDevicePushTokenAsync() {
  let token;

  if (Constants.appOwnership === 'expo') {
    console.log('Expo Go 환경에서는 푸시 알림 토큰 발급을 지원하지 않습니다.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('푸시 알림 권한이 거부되었습니다.');
      return null;
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    } catch (e) {
      console.error('Device Push Token 발급 실패:', e);
    }
  }

  return token;
}