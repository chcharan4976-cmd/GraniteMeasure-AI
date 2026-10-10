import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { Button } from '../src/components/Button';
import { useTranslation } from '../src/i18n/useTranslation';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setLanguage, t } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[typography.pageTitle, { color: colors.text, textAlign: 'center' }]}>
          Mineral Intelligence
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
          {t('welcome')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[typography.sectionTitle, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
          {t('selectLanguage')}
        </Text>
        <Button 
          title="English" 
          onPress={() => setLanguage('en')} 
          variant="outline"
        />
        <View style={{ height: spacing.md }} />
        <Button 
          title="తెలుగు" 
          onPress={() => setLanguage('te')} 
          variant="outline"
        />
        <View style={{ height: spacing.xl }} />
        <Button 
          title={t('continue')} 
          onPress={() => router.push('/auth')} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxl }
});
