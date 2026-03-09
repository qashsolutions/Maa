import { TextStyle } from 'react-native';

export const FontFamily = {
  displayRegular: 'PlayfairDisplay-Regular',
  displayLight: 'PlayfairDisplay-Light',
  displaySemiBold: 'PlayfairDisplay-SemiBold',
  displayBold: 'PlayfairDisplay-Bold',
  bodyLight: 'DMSans-Light',
  bodyRegular: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodySemiBold: 'DMSans-SemiBold',
  bodyBold: 'DMSans-Bold',
} as const;

export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: FontFamily.displayBold,
    fontSize: 31,
    lineHeight: 38,
  },
  sectionHeader: {
    fontFamily: FontFamily.displayBold,
    fontSize: 23,
    lineHeight: 30,
  },
  cardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
} as const;
