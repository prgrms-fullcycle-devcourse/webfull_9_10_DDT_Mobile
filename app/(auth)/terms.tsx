import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview'; 
import { useRouter } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { setToken } from '../../src/lib/token';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getAuthApi } from '../../src/api/generated/인증-auth-api/인증-auth-api';
import axiosClient from '../../src/api/axiosClient';

type TermsAgreement = {
  termsOfService: boolean;
  privacyPolicy: boolean;
  ageVerification: boolean;
};

/**
 * 회원가입 및 구글 소셜 로그인을 진행하기 전, 필수 약관 동의를 수집하고 웹뷰 팝업을 띄워 인증 절차를 수행하는 스크린 컴포넌트입니다.
 * @returns {JSX.Element} 약관 동의 체크리스트 및 구글 로그인 연동 웹뷰 레이아웃
 */
export default function Terms() {
  const router = useRouter();
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [agreement, setAgreement] = useState<TermsAgreement>({
    termsOfService: false,
    privacyPolicy: false,
    ageVerification: false,
  });
  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const allChecked =
    agreement.termsOfService &&
    agreement.privacyPolicy &&
    agreement.ageVerification;

  const handleAllCheck = () => {
    const newState = !allChecked;
    setAgreement({
      termsOfService: newState,
      privacyPolicy: newState,
      ageVerification: newState,
    });
  };

  const updateAgreement = (key: keyof TermsAgreement) => {
    setAgreement((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 구글 로그인 완료 후 웹뷰 창이 window.opener.postMessage를 호출할 때, 리액트 네이티브 웹뷰 환경에서는 opener 가 부재하여 크래시가 나므로 전용 네이티브 브릿지 코드를 미리 강제 주입
  const INJECTED_JAVASCRIPT = `
    window.opener = {
      postMessage: function(data, targetOrigin) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      },
      closed: false
    };
    window.close = function() {};
    true;
  `;

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'OAUTH_SUCCESS' && data.token) {
        setShowWebView(false);
        setIsLoading(true);

        await setToken(data.token);

        try {
          await getAuthApi(axiosClient).authControllerAgreeTerms(agreement);
        } catch (e: any) {
          // 백엔드 명세상 이미 이전에 동의를 마친 기존 회원의 회원가입 재시도 시 409 에러가 리턴되므로, 이 경우는 에러 팝업을 띄우지 않고 정상 바이패스 처리
          if (e?.response?.status !== 409) {
            console.error('약관 동의 에러', e);
          }
        }
        
        await fetchMe();
        setIsLoading(false);
        router.replace('/'); 
      }
    } catch (error) {
      console.error('메시지 파싱 에러:', error);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // postMessage 리스너가 동작하지 않는 특정 하위 OS 및 브라우저 환경을 대비해 2단계 방어막용 URL 쿼리 파라미터 파싱 폴백 로직 구축
    if (url.includes('/auth/callback?token=')) {
      setShowWebView(false);
      setIsLoading(true);

      const tokenStr = url.split('token=')[1]?.split('&')[0];
      
      if (tokenStr) {
        const token = decodeURIComponent(tokenStr);
        await setToken(token);

        try {
          await getAuthApi(axiosClient).authControllerAgreeTerms(agreement);
        } catch (e: any) {
          if (e?.response?.status !== 409) {
            console.error('약관 동의 에러', e);
          }
        }
        
        await fetchMe();
        setIsLoading(false);
        router.replace('/');
      }
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-[#050816]">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="p-2">
            <X color="white" size={24} />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">약관 동의</Text>
        </View>

        <View className="flex-1 px-6 pt-8">
          <Text className="text-white/70 text-2xl leading-relaxed mb-8">
            서비스 이용을 위해{"\n"}약관에 동의해 주세요.
          </Text>

          <View className="gap-4">
            <Pressable onPress={handleAllCheck} className="flex-row items-center bg-white/10 p-4 rounded-xl border border-white/20">
              <View className={`w-6 h-6 rounded-md items-center justify-center border ${allChecked ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                {allChecked && <Check color="white" size={16} strokeWidth={3} />}
              </View>
              <Text className="text-white font-bold ml-3 text-base">약관 전체동의</Text>
            </Pressable>

            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <Pressable onPress={() => updateAgreement('termsOfService')} className="flex-row items-center flex-1">
                <View className={`w-5 h-5 rounded-md items-center justify-center border ${agreement.termsOfService ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                  {agreement.termsOfService && <Check color="white" size={14} strokeWidth={3} />}
                </View>
                <Text className="text-white ml-3">서비스 이용약관 <Text className="text-red-400">(필수)</Text></Text>
              </Pressable>
              <ChevronRight color="gray" size={20} />
            </View>

            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <Pressable onPress={() => updateAgreement('privacyPolicy')} className="flex-row items-center flex-1">
                <View className={`w-5 h-5 rounded-md items-center justify-center border ${agreement.privacyPolicy ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                  {agreement.privacyPolicy && <Check color="white" size={14} strokeWidth={3} />}
                </View>
                <Text className="text-white ml-3">개인정보 수집 및 이용동의 <Text className="text-red-400">(필수)</Text></Text>
              </Pressable>
              <ChevronRight color="gray" size={20} />
            </View>

            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <Pressable onPress={() => updateAgreement('ageVerification')} className="flex-row items-center flex-1">
                <View className={`w-5 h-5 rounded-md items-center justify-center border ${agreement.ageVerification ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                  {agreement.ageVerification && <Check color="white" size={14} strokeWidth={3} />}
                </View>
                <Text className="text-white ml-3">만 14세 이상 확인 <Text className="text-red-400">(필수)</Text></Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1" />

          <Pressable
            disabled={!allChecked || isLoading}
            onPress={() => setShowWebView(true)}
            className={`w-full py-4 rounded-[14px] items-center mb-6 ${allChecked ? 'bg-white' : 'bg-white/20'}`}
          >
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text className={`font-bold text-[16px] ${allChecked ? 'text-black' : 'text-white/40'}`}>
                Google로 계속하기
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={showWebView} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-end p-4">
            <Pressable onPress={() => setShowWebView(false)}>
              <Text className="text-blue-500 font-bold text-base">닫기</Text>
            </Pressable>
          </View>
          <WebView
            source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}/auth/google` }}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT} 
            onMessage={handleWebViewMessage} 
            onNavigationStateChange={handleNavigationStateChange} 
            incognito={true}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setShowWebView(false);
              setIsLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent.statusCode);
              setShowWebView(false);
              setIsLoading(false);
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}