import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

interface PenaltyRouletteProps {
  mustStartSpinning: boolean;
  targetIndex: number;
  onStopSpinning: () => void;
  items?: string[];
}

export const PenaltyRoulette = ({
  mustStartSpinning,
  targetIndex,
  onStopSpinning,
  items = [],
}: PenaltyRouletteProps) => {
  const displayItems = items.length > 0 ? items : ['준비중'];
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mustStartSpinning) {
      const itemAngle = 360 / displayItems.length;
      // 랜덤하게 여러 번 회전 효과 (예: 5바퀴 반 = 1800도)
      const spinCount = 5;
      const targetRotation = 360 * spinCount - (itemAngle * targetIndex) - (itemAngle / 2);

      Animated.timing(spinAnim, {
        toValue: targetRotation,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, // 네이티브 스레드 사용 (성능 향상)
      }).start(() => {
        onStopSpinning();
        // 다음 스핀을 위해 각도 보정
        spinAnim.setValue(targetRotation % 360);
      });
    }
  }, [mustStartSpinning, targetIndex, displayItems.length]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const radius = 140;
  const center = radius;

  // 피자 조각(Path) 계산 함수
  const createPieSlice = (index: number, total: number) => {
    const startAngle = (index * 360) / total;
    const endAngle = ((index + 1) * 360) / total;
    
    const startX = center + radius * Math.cos((Math.PI * startAngle) / 180 - Math.PI / 2);
    const startY = center + radius * Math.sin((Math.PI * startAngle) / 180 - Math.PI / 2);
    const endX = center + radius * Math.cos((Math.PI * endAngle) / 180 - Math.PI / 2);
    const endY = center + radius * Math.sin((Math.PI * endAngle) / 180 - Math.PI / 2);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  return (
    <View className="relative w-[280px] h-[280px] items-center justify-center my-4">
      {/* 고정된 빨간색 화살표 (상단) */}
      <View className="absolute top-[-10px] z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#F85A5A]" />
      
      {/* 애니메이션이 들어가는 룰렛 판 */}
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={280} height={280} viewBox="0 0 280 280">
          <G>
            {displayItems.map((item, index) => {
              // 텍스트 위치 및 회전 계산
              const angle = (index * 360) / displayItems.length + 180 / displayItems.length;
              const textRadius = radius * 0.65;
              const textX = center + textRadius * Math.cos((Math.PI * angle) / 180 - Math.PI / 2);
              const textY = center + textRadius * Math.sin((Math.PI * angle) / 180 - Math.PI / 2);

              return (
                <React.Fragment key={index}>
                  <Path
                    d={createPieSlice(index, displayItems.length)}
                    fill={index % 2 === 0 ? '#4c1d95' : '#2e1065'}
                    stroke="#312e81"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${angle}, ${textX}, ${textY})`}
                  >
                    {item.length > 8 ? item.substring(0, 8) + '...' : item}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* 중앙 로고원 */}
      <View className="absolute z-10 w-[50px] h-[50px] bg-[#0f0e17] rounded-full border-[3px] border-[#312e81] items-center justify-center shadow-lg">
        <Text className="text-white font-extrabold text-[12px] tracking-widest">DDT</Text>
      </View>
    </View>
  );
};