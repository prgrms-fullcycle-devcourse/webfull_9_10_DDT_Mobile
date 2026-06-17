import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 앱 전반에서 공통으로 사용되는 다목적 버튼 컴포넌트입니다.
 * 지정된 디자인 시스템의 variant에 따라 스타일을 렌더링하며 로딩 상태 관리를 지원합니다.
 * @param {ButtonProps} props - 버튼 컴포넌트에 주입되는 설정 객체
 * @returns {JSX.Element} 렌더링된 버튼 인스턴스
 */
export const Button = ({
  title,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  
  const getVariantStyle = () => {
    // API 통신 중이거나 조건이 불충족된 상태에서는 시각적으로 비활성화 처리
    if (disabled || isLoading) return 'bg-[#1F2937] border-transparent'; 

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
    if (disabled || isLoading) return 'text-[#9CA3AF]';

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