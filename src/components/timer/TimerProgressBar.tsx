import React from 'react';
import { View, Text } from 'react-native';

type TimerMode = 'FOCUS' | 'BREAK';

interface TimerProgressBarProps {
  mode: TimerMode;
  currentSession: number;
  totalSessions: number;
  timeLeft: number;
  totalDuration: number;
  focusDuration: number;
  breakDuration: number;
}

/**
 * 타이머 화면 최상단에서 전체 스터디 계획의 흐름과 진척 상황(완료된 라운드, 현재 진행 분절, 남은 세션 수)을 뽀모도로 세션 노드별 바 형태로 세분화해 시각화해주는 인디케이터 바 컴포넌트입니다.
 * @param {TimerProgressBarProps} props - 진행 사이클 메타데이터 및 잔여 분초 통계 객체
 * @returns {JSX.Element} 누적 진척도 가로 바 UI
 */
export const TimerProgressBar = ({
  mode,
  currentSession,
  totalSessions,
  timeLeft,
  totalDuration,
  focusDuration,
  breakDuration,
}: TimerProgressBarProps) => {
  const isFocus = mode === 'FOCUS';
  const displayTime = Math.max(0, timeLeft);
  const currentRatio = totalDuration > 0 ? ((totalDuration - displayTime) / totalDuration) * 100 : 0;

  return (
    <View className="w-full max-w-sm mb-8 px-4">
      <View className="flex-row items-center h-1.5 w-full">
        {Array.from({ length: totalSessions }).map((_, index) => {
          const sessionNum = index + 1;

          // 이미 완료된 과거 인덱스 사이클 마디는 가로 너비를 100% 완전 충전시키고, 현재 도달한 마디는 잔여 비율을 동적으로 등치 계산하여 게이지 가변 렌더링
          let focusWidth = "0%";
          if (sessionNum < currentSession) focusWidth = "100%";
          else if (sessionNum === currentSession) focusWidth = isFocus ? `${currentRatio}%` : "100%";

          let breakWidth = "0%";
          if (sessionNum < currentSession) breakWidth = "100%";
          else if (sessionNum === currentSession) breakWidth = isFocus ? "0%" : `${currentRatio}%`;

          return (
            <View key={sessionNum} className="flex-1 flex-row items-center h-full mx-0.5">
              {/* 집중 시간과 휴식 시간의 물리적 분 배정 비율 격차를 가로 너비 장단 크기에 정비례하게 유연히 반영하도록 flexGrow 가중치 공식 수립 */}
              <View className="h-full bg-[#1F1E29] rounded-full overflow-hidden" style={{ flexGrow: focusDuration }}>
                <View className="h-full bg-[#7c3aed] rounded-full" style={{ width: focusWidth as any }} />
              </View>
              {sessionNum < totalSessions && (
                <View className="h-full bg-[#1F1E29] rounded-full overflow-hidden ml-1" style={{ flexGrow: breakDuration }}>
                  <View className="h-full bg-[#22C55E] rounded-full" style={{ width: breakWidth as any }} />
                </View>
              )}
            </View>
          );
        })}
      </View>
      
      <View className="flex-row justify-between mt-3">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-[#7c3aed] mr-1.5" />
          <Text className="text-[#64748B] text-xs font-bold mr-3">집중</Text>
          <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-1.5" />
          <Text className="text-[#64748B] text-xs font-bold">휴식</Text>
        </View>
        <Text className="text-[#64748B] text-xs font-bold">{currentSession}/{totalSessions} 세션</Text>
      </View>
    </View>
  );
};