// src/components/timer/TimerCircle.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width } = Dimensions.get('window');

interface TimerCircleProps {
  timeLeft: number;
  totalDuration: number;
  strokeColor: string;
  subStatusText: string;
}

export function TimerCircle({
  timeLeft,
  totalDuration,
  strokeColor,
  subStatusText,
}: TimerCircleProps) {
  const radius = width * 0.35;
  const circumference = 2 * Math.PI * radius;
  
  // 남은 시간에 따른 테두리 오프셋 계산
  const displayTime = Math.max(0, timeLeft);
  const targetOffset = totalDuration > 0
    ? circumference - ((totalDuration - displayTime) / totalDuration) * circumference
    : circumference;

  const animatedOffset = useRef(new Animated.Value(targetOffset)).current;

  useEffect(() => {
    // 시간이 리셋되는 순간(페이즈 전환)에는 애니메이션 없이 즉각 반영
    if (timeLeft === totalDuration) {
      animatedOffset.setValue(targetOffset);
    } else {
      Animated.timing(animatedOffset, {
        toValue: targetOffset,
        duration: 1000, // 1초 단위 부드러운 전환
        useNativeDriver: true,
      }).start();
    }
  }, [targetOffset, timeLeft, totalDuration, animatedOffset]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View className="relative items-center justify-center">
      <Svg width={width * 0.8} height={width * 0.8} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* 배경 원 */}
        <Circle
          cx={width * 0.4}
          cy={width * 0.4}
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="12"
          fill="transparent"
        />
        {/* 애니메이션 진행 원 */}
        <AnimatedCircle
          cx={width * 0.4}
          cy={width * 0.4}
          r={radius}
          stroke={strokeColor}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
        />
      </Svg>

      <View className="absolute items-center justify-center">
        <Text className="text-[#94A3B8] text-sm mb-1">{subStatusText}</Text>
        <Text className="text-white text-6xl font-bold tracking-wider font-mono">
          {formatTime(displayTime)}
        </Text>
      </View>
    </View>
  );
}