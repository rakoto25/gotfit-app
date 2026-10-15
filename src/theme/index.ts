import { Platform } from 'react-native';

export const colors = {
  canvas: '#F6F3EB',
  paper: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAF8',
  ink: '#15211B',
  inkSoft: '#24372E',
  text: '#15211B',
  muted: '#66716B',
  brand: '#D9B55B',
  brandStrong: '#9A6B16',
  brandSoft: '#F5DEA2',
  sage: '#CBD7C5',
  sageDeep: '#AEBFA8',
  sand: '#EFE8D8',
  coral: '#F5DEA2',
  lavender: '#E5E7E2',
  sky: '#EEF2ED',
  line: '#E5E7E2',
  lineStrong: '#D4DAD6',
  success: '#3F765B',
  warning: '#9A6B16',
  danger: '#B42318',
  white: '#FFFFFF',
  black: '#000000',

  // Alias historiques conservés pour ne pas casser les écrans existants.
  // Ils pointent maintenant vers l'or du logo officiel Gotfit.
  lime: '#F5DEA2',
  limeStrong: '#9A6B16',
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  display: 'PlayfairDisplay_700Bold',
};

export const shadow = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 26,
  },
}) ?? {};

export const heroPhotos = {
  home: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=88',
  coach: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=86',
  wellness: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1000&q=86',
};
