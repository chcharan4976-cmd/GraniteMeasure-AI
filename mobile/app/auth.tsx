import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { Button } from '../src/components/Button';
import { useTranslation } from '../src/i18n/useTranslation';
import { useAuthStore } from '../src/store/useAuthStore';
import { login } from '../src/api/auth';
import { ShieldCheck, User } from 'lucide-react-native';

const DEV_ROLES = [
  { role: 'Officer', username: 'officer', name: 'Mining Officer Rao' },
  { role: 'Quarry Operator', username: 'operator', name: 'Quarry Operator Reddy' },
  { role: 'Supervisor', username: 'supervisor', name: 'Field Supervisor Naidu' },
  { role: 'Admin', username: 'admin', name: 'System Administrator' },
];

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const setAuthUser = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('officer123');
  const [selectedRole, setSelectedRole] = useState('Officer');
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (r: typeof DEV_ROLES[0]) => {
    setSelectedRole(r.role);
    setUsername(r.username);
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
        name: authRes.full_name || authRes.username,
        username: authRes.username,
        role: authRes.role,
        token: authRes.access_token,
      });

      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert(
        'Authentication Error',
        e.response?.data?.detail || 'Unable to authenticate. Using local offline session.'
      );
      // Fallback local dev login
      setAuthUser({
        id: 2,
        name: 'Mining Officer Rao',
        username: 'officer',
        role: 'Officer',
        token: 'dev-token-officer',
      });
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.brandHeader}>
          <ShieldCheck color={colors.primary} size={40} />
          <Text style={[typography.heroMeasurement, { color: colors.text, marginTop: spacing.sm }]}>
            GraniteMeasure AI
          </Text>
          <Text style={[typography.body, { color: colors.accent, textAlign: 'center' }]}>
            Andhra Pradesh Mining & Geology Department
          </Text>
        </View>

        <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.xs }]}>
          Select Role (Local Dev Demo)
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
            title={loading ? 'Authenticating...' : t('login')}
            onPress={handleLogin}
            disabled={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
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
