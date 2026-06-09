import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Button = ({
  title,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  // 웹 버전(Tailwind)과 동일한 색상 매핑
  const getVariantStyle = () => {
    if (disabled || isLoading) return 'bg-[#1F2937] border-transparent'; // 비활성화 시 회색 처리

    switch (variant) {
      case 'primary': return 'bg-[#7c3aed]';
      case 'secondary': return 'bg-[#242136] border border-[#914CFF]';
      case 'outline': return 'bg-transparent border border-white/20';
      case 'ghost': return 'bg-transparent';
      case 'destructive': return 'bg-[#ef4444]';
      default: return 'bg-[#7c3aed]';
    }
  };

  const getTextStyle = () => {
    if (disabled || isLoading) return 'text-[#9CA3AF]'; // 비활성화 텍스트

    switch (variant) {
      case 'outline':
      case 'ghost': return 'text-white/80';
      default: return 'text-white';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`w-full h-[52px] rounded-[14px] items-center justify-center flex-row active:opacity-80 ${getVariantStyle()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? 'white' : '#9CA3AF'} />
      ) : children ? (
        children
      ) : (
        <Text className={`text-[16px] font-bold ${getTextStyle()}`}>{title}</Text>
      )}
    </Pressable>
  );
};