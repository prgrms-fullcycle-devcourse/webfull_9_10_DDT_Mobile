import { ImageSourcePropType } from 'react-native';

export const PROFILE_IMAGE_OPTIONS = [
  { key: 'basic_image_key_01', src: require('../../assets/images/avatars/bear.png') as ImageSourcePropType, label: 'bear' },
  { key: 'basic_image_key_02', src: require('../../assets/images/avatars/cat.png') as ImageSourcePropType, label: 'cat' },
  { key: 'basic_image_key_03', src: require('../../assets/images/avatars/crocodile.png') as ImageSourcePropType, label: 'crocodile' },
  { key: 'basic_image_key_04', src: require('../../assets/images/avatars/fox.png') as ImageSourcePropType, label: 'fox' },
  { key: 'basic_image_key_05', src: require('../../assets/images/avatars/hedgehog.png') as ImageSourcePropType, label: 'hedgehog' },
  { key: 'basic_image_key_06', src: require('../../assets/images/avatars/monkey.png') as ImageSourcePropType, label: 'monkey' },
  { key: 'basic_image_key_07', src: require('../../assets/images/avatars/penguin.png') as ImageSourcePropType, label: 'penguin' },
  { key: 'basic_image_key_08', src: require('../../assets/images/avatars/pig.png') as ImageSourcePropType, label: 'pig' },
  { key: 'basic_image_key_09', src: require('../../assets/images/avatars/rabbit.png') as ImageSourcePropType, label: 'rabbit' },
  { key: 'basic_image_key_10', src: require('../../assets/images/avatars/shiba.png') as ImageSourcePropType, label: 'shiba' },
];

export const DEFAULT_PROFILE_IMAGE_KEY = 'basic_image_key_01';

// 웹 대시보드 백엔드 원본 도메인 엔티티 명세와 모바일 클라이언트 로컬 스토리지 데이터 간 규격을 맞추기 위한 레거시 프로퍼티 맵핑 테이블
const activeToLegacyProfileKey: Record<string, string> = {
  AVATAR_BEAR: 'basic_image_key_01',
  AVATAR_CAT: 'basic_image_key_02',
  AVATAR_CROCODILE: 'basic_image_key_03',
  AVATAR_FOX: 'basic_image_key_04',
  AVATAR_HEDGEHOG: 'basic_image_key_05',
  AVATAR_MONKEY: 'basic_image_key_06',
  AVATAR_PENGUIN: 'basic_image_key_07',
  AVATAR_PIG: 'basic_image_key_08',
  AVATAR_RABBIT: 'basic_image_key_09',
  AVATAR_SHIBA: 'basic_image_key_10',
};

const legacyToActiveProfileKey = Object.entries(activeToLegacyProfileKey).reduce(
  (acc, [active, legacy]) => ({ ...acc, [legacy]: active }),
  {} as Record<string, string>,
);

/**
 * 전달받은 유저 프로필 키값에 매핑되는 로컬 에셋 이미지 소스(Require)를 안전하게 판별하여 반환합니다.
 * @param {string | null} [key] - DB 혹은 스토어에 보관 중인 프로필 고유 키 명칭
 * @returns {ImageSourcePropType} React Native Image 컴포넌트에 바인딩할 원본 이미지 참조 객체
 */
export const getProfileImageSrc = (key?: string | null): ImageSourcePropType => {
  if (!key) return PROFILE_IMAGE_OPTIONS[0].src;
  
  const option = PROFILE_IMAGE_OPTIONS.find((item) => item.key === key);
  if (option) return option.src;

  // DB 마이그레이션 및 웹 연동 등으로 웹 스펙 키값(ex: AVATAR_BEAR)이 유입될 시 예외 처리를 유연하게 지원하도록 2단계로 역변환 폴백 처리
  const activeKey = legacyToActiveProfileKey[key] || DEFAULT_PROFILE_IMAGE_KEY;
  const fallbackOption = PROFILE_IMAGE_OPTIONS.find((item) => item.key === activeKey);
  
  return fallbackOption ? fallbackOption.src : PROFILE_IMAGE_OPTIONS[0].src;
};

/**
 * 새로운 규격의 활성 이미지 키값을 레거시 스펙의 모바일 파일 옵션 키값으로 가변 치환합니다.
 * @param {string | null} [key] - 신규 규격 이미지 명칭
 * @returns {string | undefined} 변환된 레거시 스토리지 전용 키 명칭
 */
export const getLegacyProfileImageKey = (key?: string | null) => {
  if (!key) return undefined;
  return activeToLegacyProfileKey[key] ?? key;
};

/**
 * 유입 경로가 불분명한 유저 이미지 메타 데이터를 모바일 옵션 리스트에 완전히 매핑 가능한 유효 키값으로 정제합니다.
 * @param {string | null} [key] - 원본 원격 메타데이터 키값
 * @returns {string | undefined} 최종 정제 가공되어 정상 식별이 보장되는 옵션 키값
 */
export const getProfileImageOptionKey = (key?: string | null) => {
  if (!key) return undefined;
  if (PROFILE_IMAGE_OPTIONS.some((item) => item.key === key)) return key;
  return legacyToActiveProfileKey[key];
};