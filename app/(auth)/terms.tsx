// app/(auth)/terms.tsx
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

  const INJECTED_JAVASCRIPT = `
    window.opener = {
      postMessage: function(data, targetOrigin) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    };
    window.close = function() {}; // 백엔드의 close() 호출 에러 방지
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

            {/* 서비스 이용약관 */}
            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <Pressable onPress={() => updateAgreement('termsOfService')} className="flex-row items-center flex-1">
                <View className={`w-5 h-5 rounded-md items-center justify-center border ${agreement.termsOfService ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                  {agreement.termsOfService && <Check color="white" size={14} strokeWidth={3} />}
                </View>
                <Text className="text-white ml-3">서비스 이용약관 <Text className="text-red-400">(필수)</Text></Text>
              </Pressable>
              <ChevronRight color="gray" size={20} />
            </View>

            {/* 개인정보 수집 동의 */}
            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <Pressable onPress={() => updateAgreement('privacyPolicy')} className="flex-row items-center flex-1">
                <View className={`w-5 h-5 rounded-md items-center justify-center border ${agreement.privacyPolicy ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-white/40'}`}>
                  {agreement.privacyPolicy && <Check color="white" size={14} strokeWidth={3} />}
                </View>
                <Text className="text-white ml-3">개인정보 수집 및 이용동의 <Text className="text-red-400">(필수)</Text></Text>
              </Pressable>
              <ChevronRight color="gray" size={20} />
            </View>

            {/* 만 14세 이상 확인 */}
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
            className={`w-full py-4 rounded-2xl items-center ${allChecked ? 'bg-white' : 'bg-white/20'}`}
          >
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text className={`font-bold text-lg ${allChecked ? 'text-black' : 'text-white/40'}`}>
                Google로 계속하기
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 구글 로그인 웹뷰 모달 */}
      <Modal visible={showWebView} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-end p-4">
            <Pressable onPress={() => setShowWebView(false)}>
              <Text className="text-blue-500 font-bold text-base">닫기</Text>
            </Pressable>
          </View>
          <WebView
            source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}/auth/google` }}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onMessage={handleWebViewMessage}
            incognito={true} // 캐시 방지
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}