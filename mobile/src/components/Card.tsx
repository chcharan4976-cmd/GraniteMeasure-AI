import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/spacing';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => {
  const { colors } = useTheme();
  
  return (
    <View 
      style={[
        styles.card, 
        { backgroundColor: colors.elevated, borderColor: colors.border },
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
