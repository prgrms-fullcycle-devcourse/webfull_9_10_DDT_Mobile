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

/**
 * 메인 집중 세션 화면 중앙에서 흐르는 잔여 초 단위 시간을 SVG 원형 도넛 트랙 프로그래스로 드로잉 연출해주는 비주얼 타이머 서클 컴포넌트입니다.
 * @param {TimerCircleProps} props - 잔여 초, 총 할당 초 및 모드별 테마 색상 메타 데이터 정보
 * @returns {JSX.Element} 애니메이션 처리가 위임된 원형 타이머 보드 UI
 */
export function TimerCircle({
  timeLeft,
  totalDuration,
  strokeColor,
  subStatusText,
}: TimerCircleProps) {
  const radius = width * 0.35;
  const circumference = 2 * Math.PI * radius;
  
  const displayTime = Math.max(0, timeLeft);
  const targetOffset = totalDuration > 0
    ? circumference - ((totalDuration - displayTime) / totalDuration) * circumference
    : circumference;

  const animatedOffset = useRef(new Animated.Value(targetOffset)).current;

  useEffect(() => {
    // 뽀모도로 페이즈가 집중에서 휴식으로(혹은 반대로) 완전히 리셋 전초되는 턴 시점에는 부드러운 트랙 역류 왜곡 애니메이션 현상을 차단하기 위해 타이밍 모션을 생략하고 테두리 오프셋을 즉시 동기화 리셋 유도
    if (timeLeft === totalDuration) {
      animatedOffset.setValue(targetOffset);
    } else {
      Animated.timing(animatedOffset, {
        toValue: targetOffset,
        duration: 1000, 
        useNativeDriver: true,
      }).start();
    }
  }, [targetOffset, timeLeft, totalDuration, animatedOffset]);

  /**
   * 초 단위를 전자시계형 분:초 디지털 라벨 포맷으로 고속 변환합니다.
   * @param {number} sec - 입력 초 수치
   * @returns {string} 가공 완료된 문자열 (ex: "24:59")
   */
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View className="relative items-center justify-center">
      {/* 90도 회전을 주어 SVG 원형 드로잉의 기점을 정수리 12시 방향부터 순차 시계방향 차오르도록 보정 조치 */}
      <Svg width={width * 0.8} height={width * 0.8} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={width * 0.4}
          cy={width * 0.4}
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="12"
          fill="transparent"
        />
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