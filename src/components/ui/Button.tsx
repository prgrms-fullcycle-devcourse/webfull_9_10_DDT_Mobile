import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  className?: string;
}

export const Button = ({
  title,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}: ButtonProps) => {
  // variant에 따른 배경색과 테두리 스타일 결정
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#7c3aed]';
      case 'secondary':
        return 'bg-[#242136] border border-[#914CFF]';
      case 'outline':
        return 'bg-transparent border border-white/20';
      case 'ghost':
        return 'bg-transparent';
      default:
        return 'bg-[#7c3aed]';
    }
  };

  // variant에 따른 텍스트 스타일 결정
  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return 'text-white/80 text-sm';
      default:
        return 'text-white text-base font-bold';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`w-full py-4 rounded-2xl items-center justify-center flex-row ${getVariantStyle()} ${
        isDisabled ? 'opacity-50' : 'opacity-100'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? 'white' : '#9CA3AF'} />
      ) : (
        <Text className={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
};