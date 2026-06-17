import React, { useState } from 'react';
import { View, Text, Modal, TextInput, ImageBackground, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { Button } from '../src/components/ui/Button';
import { useActiveRoom, getActiveRoomPath } from '../src/hooks/useActiveRoom';

const MAX_ROOM_MEMBERS = 10;

const PHASE_LABEL: Record<string, string> = {
  lobby: '입장 전',
  contract: '계약서 작성 중',
  timer: '집중 중',
};


/**
 * 홈 화면 하단에서 현재 참여 중인 방의 상태 정보를 직관적인 그리드 형태로 가시화해주는 미니 보드 컴포넌트입니다.
 * @param {StatBoxProps} props - 라벨 텍스트 및 출력 값, 말줄임 여부 옵션
 * @returns {JSX.Element} 통계 박스 레이아웃
 */
function StatBox({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <View className="flex-1 bg-[#1A1A2E] border border-white/20 rounded-xl px-3 py-3 items-center mx-1 my-1">
      <Text className="text-[11px] text-[#9CA3AF] mb-1">{label}</Text>
      <Text 
        className="text-sm font-semibold text-[#F3F4F6] text-center" 
        numberOfLines={truncate ? 1 : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * 앱의 진입점이 되는 메인 홈 스크린 컴포넌트입니다.
 * 세션 인증 상태에 따른 마이페이지/로그인 분기 처리, 활성 방 복귀 통로 및 방 코드 입력 팝업 제어를 담당합니다.
 * @returns {JSX.Element} 메인 인트로 및 액션 보드 UI
 */
export default function Home() {
  const router = useRouter();
  const { isLoggedIn, me, logout } = useAuthStore();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  
  const activeRoom = useActiveRoom();

  const handleEnterRoom = () => {
    const code = roomCode.trim();
    if (code.length === 8) {
      setShowCodeModal(false);
      router.push(`/room/${code}`);
    }
  };

  const handleRestore = () => {
    if (!activeRoom) return;
    router.push(getActiveRoomPath(activeRoom) as any);
  };

  return (
    <ImageBackground
      source={require('../assets/images/mainBackground.webp')}
      className="flex-1 bg-[#050816]"
      resizeMode="cover"
    >
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/60 z-0" />

      <SafeAreaView className="flex-1 z-10 px-6 pb-8" edges={['top', 'left', 'right']}>
        <View className="flex-row justify-end pt-4">
          {isLoggedIn && me?.role === 'user' ? (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={() => router.push('/mypage')}
            >
              <Text className="text-white/80 text-sm font-bold">마이페이지</Text>
            </Pressable>
          ) : isLoggedIn && me?.role === 'guest' ? (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={logout}
            >
              <Text className="text-white/80 text-sm font-bold">로그아웃</Text>
            </Pressable>
          ) : (
            <Pressable
              className="border border-white/20 px-4 py-2 rounded-xl bg-white/5 active:bg-white/10"
              onPress={() => router.push('/terms')}
            >
              <Text className="text-white/80 text-sm font-bold">로그인</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-1 justify-center mt-8">
          <Image 
            source={require('../assets/images/logo.webp')} 
            style={{ width: 160, height: 80, resizeMode: 'contain', marginBottom: 24 }} 
          />
          <Text className="text-white text-[32px] font-bold leading-[44px]">
            남들이 딴짓할때{"\n"}우리는 서로를 가두고{"\n"}집중한다.
          </Text>
          
          <View className="mt-5 bg-white/10 self-start px-3 py-1.5 rounded-md">
            <Text className="text-white/70 text-xs font-medium">
              계약하고 집중하고 벌칙으로 완성한다
            </Text>
          </View>
        </View>

        <View className="gap-3 mt-4">
          {activeRoom ? (
            <>
              <View className="flex-row justify-between mb-1">
                <StatBox label="참여 중 방 이름" value={activeRoom.title} truncate />
                <StatBox label="참여 중 멤버 수" value={`${activeRoom.memberCount} / ${MAX_ROOM_MEMBERS}`} />
              </View>
              <View className="flex-row justify-between mb-3">
                <StatBox label="방 상태" value={PHASE_LABEL[activeRoom.phase] ?? activeRoom.phase} />
                <StatBox label="방장 여부" value={activeRoom.isHost ? '방장' : '참여자'} />
              </View>
              <Button
                title="방 복귀하기"
                variant="primary"
                onPress={handleRestore}
              />
            </>
          ) : (
            <>
              <Button
                title="방 코드로 입장하기"
                variant="secondary"
                onPress={() => setShowCodeModal(true)}
              />
              <Button
                title="방 만들기"
                variant="primary"
                onPress={() => {
                  if (!isLoggedIn || me?.role === 'guest') {
                    Alert.alert(
                      '로그인 필요',
                      '방을 만들려면 로그인이 필요합니다.\n게스트는 참여만 가능해요.',
                      [
                        { text: '취소', style: 'cancel' },
                        { text: '로그인하기', onPress: () => router.push('/terms') }
                      ]
                    );
                    return;
                  }
                  router.push('/room/create');
                }}
              />
            </>
          )}
        </View>
      </SafeAreaView>

      <Modal visible={showCodeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/77 justify-center px-6">
          <View className="bg-[#1E2538] p-6 rounded-3xl gap-2">
            <Text className="text-white text-xl font-bold mb-1">방 코드로 입장</Text>
            <Text className="text-white/50 text-sm mb-4">초대받은 방 코드 8자리를 입력해주세요.</Text>
            
            <TextInput
              className="bg-[#111827] text-white px-5 h-14 rounded-2xl border border-white/10 tracking-widest text-center text-lg font-bold"
              placeholder="XXXXXXXX"
              placeholderTextColor="#6B7280"
              maxLength={8}
              // 모바일 자판의 첫 글자 자동 대문자 변환 기능을 해제하여 소문자가 포함된 코드 입력 시 오작동 방지
              autoCapitalize="none" 
              // 난수 입력 도중 키보드 상단에 엉뚱한 추천 단어가 떠서 입력을 방해하는 현상 차단
              autoCorrect={false}   
              value={roomCode}
              onChangeText={setRoomCode} 
            />
            
            <View className="flex-row gap-3 mt-6">
              <Button 
                title="취소" 
                variant="outline" 
                className="flex-1" 
                onPress={() => {
                  setShowCodeModal(false);
                  setRoomCode('');
                }} 
              />
              <Button 
                title="입장하기" 
                className="flex-1" 
                disabled={roomCode.length !== 8} 
                onPress={handleEnterRoom} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}