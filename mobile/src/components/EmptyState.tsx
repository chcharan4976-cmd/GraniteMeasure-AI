import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { Inbox } from 'lucide-react-native';

interface Props {
  message: string;
}

export const EmptyState: React.FC<Props> = ({ message }) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      <Inbox color={colors.textSecondary} size={48} />
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
