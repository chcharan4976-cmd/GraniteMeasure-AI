import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

export type BadgeStatus =
  | 'PENDING'
  | 'MEASURED'
  | 'ESTIMATED'
  | 'VERIFIED'
  | 'PARTIAL'
  | 'UNVERIFIED'
  | 'FAILED'
  | 'REGISTERED'
  | 'CAPTURING'
  | 'CAPTURED'
  | 'ANALYZING'
  | string;

interface StatusBadgeProps {
  status: BadgeStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { colors } = useTheme();

  let color = colors.info;
  const upper = (status || '').toUpperCase();

  if (upper === 'MEASURED' || upper === 'VERIFIED') {
    color = colors.success;
  } else if (upper === 'ESTIMATED' || upper === 'PARTIAL' || upper === 'REVIEW_REQUIRED') {
    color = colors.warning;
  } else if (upper === 'FAILED') {
    color = colors.error;
  } else if (upper === 'REGISTERED' || upper === 'CAPTURING' || upper === 'ANALYZING') {
    color = colors.accent;
  } else {
    color = colors.textSecondary;
  }

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[typography.caption, { color, fontWeight: '700', fontSize: 10 }]}>{upper}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
