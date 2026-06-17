import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 포그라운드 상태에서도 타이머 이탈 및 교대 경고 배너가 푸시 형태로 화면 최상단에 완전 노출될 수 있도록 글로벌 알림 핸들러 강제 바인딩
Notifications.setNotificationHandler({
  handleNotification = async () => ({
    shouldShowBanner: true, 
    shouldShowList: true,   
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 원격 FCM 혹은 APNS 게이트웨이에 등록하여 타겟팅 알림을 수신하기 위한 네이티브 기기 푸시 토큰을 안전하게 발급합니다.
 * @returns {Promise<string | null>} 발급 완료된 고유 푸시 디바이스 토큰 문자열 (실패 혹은 시뮬레이터일 경우 null)
 */
export async function getDevicePushTokenAsync() {
  let token;

  // Expo Go 공용 샌드박스 크래들 환경에서는 서명 샌드박스 권한 문제로 인해 하드웨어 푸시 토큰 발급이 원천 불가능하므로 예외 탈출 처리
  if (Constants.appOwnership === 'expo') {
    console.log('Expo Go 환경에서는 푸시 알림 토큰 발급을 지원하지 않습니다.');
    return null;
  }

  // 안드로이드 8.0(Oreo) 이상 버전에서 백그라운드 푸시 알림이 유실되거나 씹히는 현상을 전면 방어하기 위해 맥스 중요도의 단독 채널 개설
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