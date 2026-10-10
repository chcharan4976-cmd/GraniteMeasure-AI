import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Button } from '../../src/components/Button';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.pageTitle, { color: colors.text, margin: spacing.lg }]}>{t('settings')}</Text>
      <View style={styles.section}>
        <Text style={[typography.sectionTitle, { color: colors.text, marginBottom: spacing.md }]}>Theme</Text>
        <View style={styles.row}>
          <Button title="Light" variant={theme === 'light' ? 'primary' : 'outline'} onPress={() => setTheme('light')} />
          <View style={{ width: spacing.md }} />
          <Button title="Dark" variant={theme === 'dark' ? 'primary' : 'outline'} onPress={() => setTheme('dark')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.sectionTitle, { color: colors.text, marginBottom: spacing.md }]}>Language</Text>
        <View style={styles.row}>
          <Button title="English" variant={language === 'en' ? 'primary' : 'outline'} onPress={() => setLanguage('en')} />
          <View style={{ width: spacing.md }} />
          <Button title="తెలుగు" variant={language === 'te' ? 'primary' : 'outline'} onPress={() => setLanguage('te')} />
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Button title={t('logout')} variant="secondary" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  row: { flexDirection: 'row' }
});
