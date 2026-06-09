import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 앱이 실행 중(Foreground)일 때 알림이 오면 어떻게 보여줄지 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getDevicePushTokenAsync() {
  let token;

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
      // 💡 AWS SNS를 위해 Expo 토큰이 아닌 "원시 기기 토큰(Device Push Token)"을 발급받습니다.
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    } catch (e) {
      console.error('Device Push Token 발급 실패:', e);
    }
  } else {
    console.log('푸시 알림 토큰은 실제 기기에서만 발급 가능합니다 (시뮬레이터 불가).');
  }

  return token;
}