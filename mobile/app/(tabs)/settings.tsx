import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { uploadQueue, QueueItem } from '../../src/services/uploadQueue';
import { getQuarries, QuarryItem } from '../../src/api/quarries';
import { API_URL, apiClient } from '../../src/api/client';
import {
  ShieldEmblemIcon,
  QuarryAtlasIcon,
  GraniteBlockIcon,
} from '../../src/components/DomainIcons';
import {
  Shield,
  User,
  Globe,
  Sun,
  Moon,
  CloudUpload,
  RefreshCw,
  Trash2,
  Server,
  Layers,
  LogOut,
  CheckCircle,
  Sliders,
  ChevronRight,
  Wifi,
  Activity,
} from 'lucide-react-native';

const ROLES = [
  { id: 'Officer', labelEn: 'Mining Officer', labelTe: 'మైనింగ్ అధికారి' },
  { id: 'Quarry Operator', labelEn: 'Quarry Operator', labelTe: 'క్వారీ ఆపరేటర్' },
  { id: 'Supervisor', labelEn: 'Field Supervisor', labelTe: 'ఫీల్డ్ సూపర్‌వైజర్' },
  { id: 'Admin', labelEn: 'System Admin', labelTe: 'సిస్టమ్ అడ్మిన్' },
];

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const {
    user,
    switchRole,
    updateIdentityName,
    activeQuarryId,
    activeQuarryName,
    setActiveQuarry,
    logout,
  } = useAuthStore();
  const { simpleMode, toggleSimpleMode } = useSettingsStore();
  const router = useRouter();

  const [officerNameInput, setOfficerNameInput] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [quarries, setQuarries] = useState<QuarryItem[]>([]);
  const [loadingQuarries, setLoadingQuarries] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe((items) => {
      setQueueItems(items);
    });

    (async () => {
      try {
        setLoadingQuarries(true);
        const data = await getQuarries();
        setQuarries(data);
      } catch (e) {
        console.warn('Failed to fetch quarries in settings:', e);
      } finally {
        setLoadingQuarries(false);
      }
    })();

    return () => unsubscribe();
  }, []);

  const handlePingServer = async () => {
    setIsPinging(true);
    const start = Date.now();
    try {
      await apiClient.get('/health');
      setPingLatency(Date.now() - start);
    } catch {
      setPingLatency(-1);
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveIdentity = () => {
    if (officerNameInput.trim()) {
      updateIdentityName(officerNameInput.trim());
      setIsEditingName(false);
      Alert.alert('Saved', 'Officer identity updated.');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      t('clearCache'),
      language === 'te'
        ? 'స్థానికంగా సేవ్ చేసిన డేటా మరియు పూర్తయిన అప్‌లోడ్‌లను క్లియర్ చేయాలనుకుంటున్నారా?'
        : 'Are you sure you want to clear completed queue items and local cached data?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            await uploadQueue.clearCompleted();
            Alert.alert('Success', t('cacheCleared'));
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/welcome');
  };

  const pendingCount = queueItems.filter((q) => q.status === 'pending' || q.status === 'failed').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header with Government Attribution */}
        <View style={styles.header}>
          <View style={styles.govRow}>
            <ShieldEmblemIcon size={18} color={colors.primary} />
            <Text style={[styles.govText, { color: colors.primary }]}>
              {language === 'te'
                ? 'ఆంధ్రప్రదేశ్ ప్రభుత్వ గనుల శాఖ'
                : 'Government of Andhra Pradesh • Mines Dept'}
            </Text>
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('settings')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            GraniteMeasure AI • Stone Intelligence Platform v2.4
          </Text>
        </View>

        {/* 1. Simple Mode (సులభ విధానం) Card */}
        <Card style={[styles.sectionCard, { borderColor: simpleMode ? colors.primary : colors.border, borderWidth: 1 }]}>
          <View style={styles.modeCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Sliders size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeCardTitle, { color: colors.text }]}>
                  {language === 'te' ? 'సులభ విధానం (ఫీల్డ్ మోడ్)' : 'Field Simple Mode'}
                </Text>
                <Text style={[styles.modeCardSubtitle, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'పెద్ద బటన్లు మరియు స్పష్టమైన తెలుగు సూచనలు'
                    : 'Large buttons, 4-step workflow, plain instructions'}
                </Text>
              </View>
            </View>
            <Switch
              value={simpleMode}
              onValueChange={toggleSimpleMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </Card>

        {/* 2. Identity & Instant Demo Role Switching */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Shield color={colors.primary} size={20} />
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('currentRole')} & {t('officerIdentity')}
            </Text>
          </View>

          {/* Editable Name Input */}
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
              {t('officerIdentity')}
            </Text>
            {isEditingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[
                    styles.nameInput,
                    { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface },
                  ]}
                  value={officerNameInput}
                  onChangeText={setOfficerNameInput}
                  placeholder="Enter Officer / Operator Name"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveIdentity}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.nameDisplayBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setIsEditingName(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <User color={colors.primary} size={18} style={{ marginRight: 8 }} />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>
                    {user?.name || 'Mining Officer'}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.primary }]}>{t('editIdentityName')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Instant Role Switching Chips */}
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: 8 }]}>
            {t('switchRole')} (No Password Required)
          </Text>
          <View style={styles.roleChipsRow}>
            {ROLES.map((r) => {
              const isSelected = user?.role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => switchRole(r.id)}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? '#000' : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {language === 'te' ? r.labelTe : r.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* 3. Active Quarry Context */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <QuarryAtlasIcon color={colors.accent || '#06b6d4'} size={20} />
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('activeQuarry')} Context
            </Text>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            Current: <Text style={{ color: colors.text, fontWeight: '700' }}>{activeQuarryName || 'Select a Quarry'}</Text>
          </Text>

          {loadingQuarries ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : (
            <View style={styles.quarryGrid}>
              {quarries.map((q) => {
                const isSelected = activeQuarryId === q.id;
                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[
                      styles.quarryChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setActiveQuarry(q.id, q.name)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.caption,
                        { color: isSelected ? '#000' : colors.text, fontWeight: isSelected ? '700' : '400' },
                      ]}
                    >
                      {q.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.manageQuarriesBtn, { borderColor: colors.border, marginTop: spacing.md }]}
            onPress={() => router.push('/(tabs)/quarries')}
          >
            <Text style={[styles.manageQuarriesText, { color: colors.primary }]}>
              {language === 'te' ? 'క్వారీ అట్లాస్ తెరవండి' : 'Open Quarry Atlas'}
            </Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* 4. Upload Center Link & Storage Buffer */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <CloudUpload color={pendingCount > 0 ? '#f59e0b' : colors.primary} size={20} />
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('uploadCenter')}
            </Text>
          </View>

          <View style={styles.queueStatusRow}>
            <View>
              <Text style={[styles.pendingCountNum, { color: pendingCount > 0 ? '#f59e0b' : colors.primary }]}>
                {pendingCount}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {pendingCount === 0 ? t('allSynced') : `${pendingCount} photos buffered offline`}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.openUploadsBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push('/(tabs)/upload')}
            >
              <Text style={styles.openUploadsBtnText}>
                {language === 'te' ? 'అప్‌లోడ్స్ చూడండి' : 'Manage Queue'}
              </Text>
              <ChevronRight size={16} color="#000" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* 5. Language & Theme Toggles */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Globe color={colors.primary} size={20} />
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('language')}
            </Text>
          </View>
          <View style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                {
                  backgroundColor: language === 'en' ? colors.primary : colors.surface,
                  borderColor: language === 'en' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setLanguage('en')}
            >
              <Text style={{ color: language === 'en' ? '#000' : colors.text, fontWeight: 'bold' }}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                {
                  backgroundColor: language === 'te' ? colors.primary : colors.surface,
                  borderColor: language === 'te' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setLanguage('te')}
            >
              <Text style={{ color: language === 'te' ? '#000' : colors.text, fontWeight: 'bold' }}>
                తెలుగు (Telugu)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.cardHeader, { marginTop: spacing.lg }]}>
            {theme === 'dark' ? <Moon color={colors.accent || '#06b6d4'} size={20} /> : <Sun color="#f59e0b" size={20} />}
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('theme')}
            </Text>
          </View>
          <View style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                {
                  backgroundColor: theme === 'dark' ? colors.primary : colors.surface,
                  borderColor: theme === 'dark' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setTheme('dark')}
            >
              <Text style={{ color: theme === 'dark' ? '#000' : colors.text, fontWeight: 'bold' }}>
                {t('dark')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                {
                  backgroundColor: theme === 'light' ? colors.primary : colors.surface,
                  borderColor: theme === 'light' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setTheme('light')}
            >
              <Text style={{ color: theme === 'light' ? '#000' : colors.text, fontWeight: 'bold' }}>
                {t('light')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 6. Server URL & Latency Ping */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Server color={colors.accent || '#06b6d4'} size={20} />
            <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
              {t('apiServerUrl')}
            </Text>
          </View>
          <Text style={[styles.serverUrlText, { color: colors.accent || '#06b6d4', marginTop: spacing.xs }]}>
            {API_URL}
          </Text>

          <View style={[styles.pingRow, { marginTop: spacing.sm }]}>
            <TouchableOpacity
              style={[styles.pingBtn, { borderColor: colors.border }]}
              onPress={handlePingServer}
              disabled={isPinging}
            >
              {isPinging ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Activity size={15} color={colors.primary} />
              )}
              <Text style={[styles.pingBtnText, { color: colors.text }]}>
                {isPinging ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            {pingLatency !== null && (
              <Text
                style={[
                  styles.latencyText,
                  { color: pingLatency > 0 ? colors.primary : colors.error || '#ef4444' },
                ]}
              >
                {pingLatency > 0 ? `Latency: ${pingLatency} ms (Healthy)` : 'Connection Failed'}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.systemRow}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>v2.4.0 (Expo SDK 57)</Text>
            <TouchableOpacity onPress={handleClearCache} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trash2 color={colors.error || '#ef4444'} size={15} style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: colors.error || '#ef4444' }]}>{t('clearCache')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 7. Sign Out / Reset Button */}
        <View style={{ marginTop: spacing.md, marginBottom: spacing.xxl }}>
          <Button title={t('logout')} variant="secondary" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  govRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  govText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: typography.fonts.semiBold,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  sectionCard: { marginBottom: spacing.md },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  modeCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  roleChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  nameDisplayBox: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm + 4,
    fontSize: 14,
  },
  smallBtn: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quarryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  quarryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageQuarriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  manageQuarriesText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  queueStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  pendingCountNum: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  openUploadsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  openUploadsBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverUrlText: {
    fontSize: 12,
    fontFamily: typography.fonts.medium,
  },
  pingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  latencyText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  divider: { height: 1, marginVertical: spacing.md },
  systemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
