import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

interface PenaltyRouletteProps {
  mustStartSpinning: boolean;
  targetIndex: number;
  onStopSpinning: () => void;
  items?: string[];
}

/**
 * 방 참여자들의 확정된 벌칙 항목들을 SVG 파이 조각 형태로 휠을 생성하고 감속 회전 연출을 제공하는 공용 룰렛 컴포넌트입니다.
 * @param {PenaltyRouletteProps} props - 룰렛의 기동 상태 및 연출 제어 옵션 객체
 * @returns {JSX.Element} 화살표 인디케이터가 포함된 원형 애니메이션 룰렛 UI
 */
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
      // 단순 타겟팅 이동은 회전감이 부족하므로 시각적 몰입도를 위해 강제로 5바퀴 이상을 회전시킨 후 타겟 슬롯 중앙에 안착하도록 설정
      const spinCount = 5;
      const targetRotation = 360 * spinCount - (itemAngle * targetIndex) - (itemAngle / 2);

      Animated.timing(spinAnim, {
        toValue: targetRotation,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        // 레이아웃 스레드 병목 현상 우회 및 60fps 프레임 확보를 위해 네이티브 애니메이션 드라이버 위임
        useNativeDriver: true,
      }).start(() => {
        onStopSpinning();
        // 다중 스핀 연출 시 각도가 360도를 누적 초과하여 오동작하는 버그를 완화하기 위한 보정 마스킹
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

  /**
   * 전체 항목 개수에 맞춰 특정 슬롯의 호(Arc) 영역 정보를 SVG Path 코드로 자동 연산합니다.
   * @param {number} index - 생성할 아이템의 순번
   * @param {number} total - 전체 벌칙 아이템 개수
   * @returns {string} SVG Path 'd' 속성 데이터 문자열
   */
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
      <View className="absolute top-[-10px] z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#F85A5A]" />
      
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={280} height={280} viewBox="0 0 280 280">
          <G>
            {displayItems.map((item, index) => {
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

      <View className="absolute z-10 w-[50px] h-[50px] bg-[#0f0e17] rounded-full border-[3px] border-[#312e81] items-center justify-center shadow-lg">
        <Text className="text-white font-extrabold text-[12px] tracking-widest">DDT</Text>
      </View>
    </View>
  );
};