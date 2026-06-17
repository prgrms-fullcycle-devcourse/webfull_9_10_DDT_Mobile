import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  isPassword?: boolean;
  maxLengthIndicator?: boolean;
}

/**
 * 디자인 시스템의 일관된 폼 레이아웃을 구현하며 비밀번호 숨김 전환 및 실시간 글자수 한도 인디케이터를 지원하는 공용 입력 필드 컴포넌트입니다.
 * @param {InputProps} props - 타이틀 라벨 및 입력창 필터링 옵션 객체
 * @returns {JSX.Element} 상태별 테두리 및 추가 액션 버튼이 바인딩된 입력 컴포넌트
 */
export const Input = ({
  label,
  isPassword = false,
  maxLengthIndicator = false,
  maxLength,
  value,
  ...props
}: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="gap-2 w-full">
      {label && <Text className="text-white/85 font-bold text-[15px]">{label}</Text>}
      
      <View className="relative justify-center">
        <TextInput
          className="bg-[#1A1A2E] text-white px-4 h-14 rounded-2xl border border-white/10"
          placeholderTextColor="#6B7280"
          secureTextEntry={isPassword && !showPassword}
          maxLength={maxLength}
          value={value}
          {...props}
          // 우측 끝에 배치될 눈알 패스워드 토글 아이콘 영역과 사용자가 입력한 텍스트가 겹치지 않도록 충분한 우측 가딩 여백 부여
          style={{ paddingRight: isPassword ? 48 : 16 }}
        />
        
        {isPassword && (
          <Pressable
            className="absolute right-4"
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff color="#6B7280" size={20} />
            ) : (
              <Eye color="#6B7280" size={20} />
            )}
          </Pressable>
        )}
      </View>

      {maxLengthIndicator && maxLength && (
        <Text className="text-[#6B7280] text-xs text-right mt-1">
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </View>
  );
};