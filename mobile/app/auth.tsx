import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { Button } from '../src/components/Button';
import { useTranslation } from '../src/i18n/useTranslation';
import { useAuthStore } from '../src/store/useAuthStore';
import { login } from '../src/api/auth';
import { ShieldCheck, User, Globe } from 'lucide-react-native';

const DEV_ROLES = [
  { role: 'Officer', username: 'officer', defaultName: 'Mining Officer (Field Unit)' },
  { role: 'Quarry Operator', username: 'operator', defaultName: 'Quarry Operator (Chimakkurthy)' },
  { role: 'Supervisor', username: 'supervisor', defaultName: 'Field Inspection Supervisor' },
  { role: 'Admin', username: 'admin', defaultName: 'Department Administrator' },
];

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const setAuthUser = useAuthStore((state) => state.login);

  const [selectedRole, setSelectedRole] = useState('Officer');
  const [officerName, setOfficerName] = useState('Mining Officer (Field Unit)');
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('officer123');
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (r: typeof DEV_ROLES[0]) => {
    setSelectedRole(r.role);
    setUsername(r.username);
    setOfficerName(r.defaultName);
    setPassword(`${r.username}123`);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const authRes = await login({
        username,
        password,
        role: selectedRole,
      });

      setAuthUser({
        id: authRes.user_id,
        name: officerName.trim() || authRes.full_name || authRes.username,
        username: authRes.username,
        role: authRes.role,
        token: authRes.access_token,
      });

      router.replace('/(tabs)/home');
    } catch {
      // Local fallback for offline/demo operation
      setAuthUser({
        id: 2,
        name: officerName.trim() || 'Field Officer',
        username,
        role: selectedRole,
        token: `dev-token-${selectedRole.toLowerCase()}`,
      });
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {/* Language Switcher in Header */}
          <View style={styles.topLangRow}>
            <TouchableOpacity
              style={[styles.langBtn, { borderColor: colors.border }]}
              onPress={() => setLanguage(language === 'en' ? 'te' : 'en')}
            >
              <Globe color={colors.primary} size={16} />
              <Text style={[typography.caption, { color: colors.text, marginLeft: 6 }]}>
                {language === 'en' ? 'తెలుగు' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.brandHeader}>
            <ShieldCheck color={colors.primary} size={48} />
            <Text style={[typography.heroMeasurement, { color: colors.text, marginTop: spacing.sm }]}>
              {t('appName')}
            </Text>
            <Text style={[typography.body, { color: colors.accent, textAlign: 'center', marginTop: 4 }]}>
              {t('departmentName')}
            </Text>
          </View>

          <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
            {t('selectRole')}
          </Text>
          <View style={styles.roleGrid}>
            {DEV_ROLES.map((r) => (
              <TouchableOpacity
                key={r.role}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: selectedRole === r.role ? colors.primary : colors.surface,
                    borderColor: selectedRole === r.role ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectRole(r)}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: selectedRole === r.role ? '#FFF' : colors.text, fontWeight: 'bold' },
                  ]}
                >
                  {r.role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('officerIdentity')} (Editable Demo Name)
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Officer / Inspector Name"
              placeholderTextColor={colors.textSecondary}
              value={officerName}
              onChangeText={setOfficerName}
            />

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
              Username
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Username"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
              Password
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button
              title={loading ? t('loading') : t('login')}
              onPress={handleLogin}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: spacing.xl },
  topLangRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  langBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },
  brandHeader: { alignItems: 'center', marginBottom: spacing.md },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  roleChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
});
