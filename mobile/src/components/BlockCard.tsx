import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { GraniteBlockItem } from '../api/blocks';
import { ChevronRight } from 'lucide-react-native';

interface Props {
  block: GraniteBlockItem;
}

export const BlockCard: React.FC<Props> = ({ block }) => {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/block/${block.id}`)}>
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={[typography.cardTitle, typography.mono, { color: colors.text }]}>
            {block.identifier}
          </Text>
          <StatusBadge status={block.status} />
        </View>
        <Text style={[typography.body, { color: colors.accent, marginTop: spacing.xs }]}>
          {block.color_group}
        </Text>
        {block.measurement?.length_cm != null &&
          block.measurement.breadth_cm != null &&
          block.measurement.height_cm != null && (
          <Text style={[typography.body, typography.mono, { color: colors.text, marginTop: spacing.sm }]}>
            {block.measurement.length_cm.toFixed(0)} × {block.measurement.breadth_cm.toFixed(0)} × {block.measurement.height_cm.toFixed(0)} cm
            {block.measurement.volume_m3 != null ? ` • bbox ${block.measurement.volume_m3.toFixed(2)} m³` : ''}
          </Text>
        )}
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {block.registered_at ? new Date(block.registered_at).toLocaleDateString() : 'Active'}
          </Text>
          <ChevronRight color={colors.textSecondary} size={18} />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
