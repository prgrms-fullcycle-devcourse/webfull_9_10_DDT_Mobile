import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  isPassword?: boolean;
  maxLengthIndicator?: boolean;
}

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
          style={{ paddingRight: isPassword ? 48 : 16 }} // 눈알 아이콘 공간 확보
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