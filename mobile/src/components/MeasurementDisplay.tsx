import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Props {
  label: string;
  value: number;
  unit: string;
}

export const MeasurementDisplay: React.FC<Props> = ({ label, value, unit }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[typography.heroMeasurement, typography.mono, { color: colors.text }]}>
          {value.toFixed(1)}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginLeft: 4, paddingBottom: 4 }]}>
          {unit}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  }
});
