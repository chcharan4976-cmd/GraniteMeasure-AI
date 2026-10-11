import { StyleSheet } from 'react-native';

export const fonts = {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  mono: 'IBMPlexMono-Regular',
};

const styles = StyleSheet.create({
  heroMeasurement: {
    fontFamily: fonts.bold,
    fontSize: 34,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 19,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  mono: {
    fontFamily: fonts.mono,
  },
});

export const typography = {
  ...styles,
  fonts,
};
