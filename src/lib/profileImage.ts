// src/lib/profileImage.ts
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

export const getProfileImageSrc = (key?: string | null): ImageSourcePropType => {
  if (!key) return PROFILE_IMAGE_OPTIONS[0].src;
  
  // 1. 현재 유효한 키인지 확인
  const option = PROFILE_IMAGE_OPTIONS.find((item) => item.key === key);
  if (option) return option.src;

  // 2. 레거시 키값(AVATAR_BEAR 등) 변환 시도
  const activeKey = legacyToActiveProfileKey[key] || DEFAULT_PROFILE_IMAGE_KEY;
  const fallbackOption = PROFILE_IMAGE_OPTIONS.find((item) => item.key === activeKey);
  
  return fallbackOption ? fallbackOption.src : PROFILE_IMAGE_OPTIONS[0].src;
};

export const getLegacyProfileImageKey = (key?: string | null) => {
  if (!key) return undefined;
  return activeToLegacyProfileKey[key] ?? key;
};

export const getProfileImageOptionKey = (key?: string | null) => {
  if (!key) return undefined;
  if (PROFILE_IMAGE_OPTIONS.some((item) => item.key === key)) return key;
  return legacyToActiveProfileKey[key];
};