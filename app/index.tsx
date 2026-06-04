import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// import { useAuthStore } from '../src/store/useAuthStore'; // 나중에 연결

export default function Home() {
  const router = useRouter();
  
  // TODO: Zustand 완성 후 교체할 상태들
  const isLoggedIn = false;
  // const me = useAuthStore((state) => state.me);

  const handleOpenTerms = () => {
    // 웹에서는 window.open을 썼지만, 앱에서는 모달 스크린이나 웹뷰로 이동해야 함
    Alert.alert('로그인', '구글 로그인 화면으로 이동합니다.');
    // router.push('/terms');
  };

  const handleOpenCodeDialog = () => {
    // 앱 내 모달 띄우기 (추후 구현)
    Alert.alert('방 코드 입력', '방 코드 입력 모달 띄우기');
  };

  return (
    <View className="flex-1 bg-[#050816]">
      {/* 배경 그라데이션 및 이미지 효과가 들어갈 자리 */}
      <View className="absolute inset-0 bg-black/40 z-0" />

      <SafeAreaView className="flex-1 z-10 px-6 pb-8">
        {/* 우측 상단 로그인 / 마이페이지 버튼 */}
        <View className="flex-row justify-end pt-4">
          {isLoggedIn ? (
            <Pressable
              className="border border-white/20 px-3 py-2 rounded-md"
              onPress={() => router.push('/mypage')}
            >
              <Text className="text-white text-sm">마이페이지</Text>
            </Pressable>
          ) : (
            <Pressable
              className="border border-white/20 px-3 py-2 rounded-md"
              onPress={handleOpenTerms}
            >
              <Text className="text-white text-sm">로그인</Text>
            </Pressable>
          )}
        </View>

        {/* 메인 카피 영역 */}
        <View className="flex-1 justify-center mt-8">
          <Text className="text-white text-3xl font-bold leading-snug">
            남들이 딴짓할때{"\n"}우리는 서로를 가두고{"\n"}집중한다.
          </Text>
          
          <View className="mt-5 bg-white/10 self-start px-3 py-1.5 rounded-md">
            <Text className="text-white/70 text-xs font-medium">
              계약하고 집중하고 벌칙으로 완성한다
            </Text>
          </View>
        </View>

        {/* 하단 버튼 영역 */}
        <View className="gap-3">
          <Pressable
            className="w-full bg-[#242136] border border-[#914CFF] py-4 rounded-2xl items-center"
            onPress={handleOpenCodeDialog}
          >
            <Text className="text-white/90 font-bold text-base">방 코드로 입장하기</Text>
          </Pressable>

          <Pressable
            className="w-full bg-white py-4 rounded-2xl items-center"
            onPress={() => router.push('/room/create')} // 👈 나중에 만들 방 생성 페이지
          >
            <Text className="text-black font-bold text-base">방 만들기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}