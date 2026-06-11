// src/components/timer/TimerProgressBar.tsx
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

          let focusWidth = "0%";
          if (sessionNum < currentSession) focusWidth = "100%";
          else if (sessionNum === currentSession) focusWidth = isFocus ? `${currentRatio}%` : "100%";

          let breakWidth = "0%";
          if (sessionNum < currentSession) breakWidth = "100%";
          else if (sessionNum === currentSession) breakWidth = isFocus ? "0%" : `${currentRatio}%`;

          return (
            <View key={sessionNum} className="flex-1 flex-row items-center h-full mx-0.5">
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