import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { useTranslation } from '../src/i18n/useTranslation';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import {
  GraniteBlockIcon,
  ShieldEmblemIcon,
  QuarryAtlasIcon,
} from '../src/components/DomainIcons';
import { Check, Compass, Sparkles, UserCheck, Shield } from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { login } = useAuthStore();
  const { simpleMode, setSimpleMode } = useSettingsStore();

  const [selectedRole, setSelectedRole] = useState<'Officer' | 'Admin'>('Officer');
  const [selectedMode, setSelectedMode] = useState<boolean>(simpleMode);

  const handleEnterWorkspace = () => {
    setSimpleMode(selectedMode);
    login({
      id: selectedRole === 'Officer' ? 2 : 1,
      name:
        selectedRole === 'Officer'
          ? language === 'te'
            ? 'ఫీల్డ్ మైనింగ్ అధికారి (ప్రకాశం)'
            : 'Field Mining Officer (Prakasam Dist)'
          : language === 'te'
          ? 'గనుల శాఖ సంచాలకుడు'
          : 'Director of Mines & Geology',
      username: selectedRole.toLowerCase(),
      role: selectedRole,
      token: `dev-token-${selectedRole.toLowerCase()}`,
    });
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Government & Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.emblemRow}>
            <ShieldEmblemIcon size={28} color={colors.primary} />
            <Text style={[styles.govBadge, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'ఆంధ్రప్రదేశ్ ప్రభుత్వం • గనులు & భూగర్భ శాఖ'
                : 'Govt of Andhra Pradesh • Mines & Geology'}
            </Text>
          </View>

          <View style={styles.titleRow}>
            <GraniteBlockIcon size={38} color={colors.primary} />
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[typography.pageTitle, { color: colors.text, fontSize: 26 }]}>
                GraniteMeasure AI
              </Text>
              <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'te' ? 'స్టోన్ ఇంటెలిజెన్స్ & కొలతల వేదిక' : 'Stone Intelligence Platform'}
              </Text>
            </View>
          </View>

          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, fontSize: 13 }]}>
            {language === 'te'
              ? 'మొబైల్ ఫోటోగ్రామెట్రీ ద్వారా గ్రానైట్ బ్లాక్ కొలతలు, రంధ్రాలు/పగుళ్ల విశ్లేషణ మరియు సీనరేజ్ నిర్ధారణ.'
              : 'Multi-view photogrammetry, calibrated metric measurement, cavity/fracture intelligence, and seigniorage clearance.'}
          </Text>
        </View>

        {/* Language Selection Bar */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'భాషను ఎంచుకోండి / SELECT LANGUAGE' : 'SELECT LANGUAGE / భాష'}
          </Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.pillBtn,
                language === 'en'
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.pillText, { color: language === 'en' ? '#FFF' : colors.text }]}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.pillBtn,
                language === 'te'
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setLanguage('te')}
            >
              <Text style={[styles.pillText, { color: language === 'te' ? '#FFF' : colors.text }]}>
                తెలుగు (Telugu)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Workspace Role Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'కార్యక్షేత్రం ఎంపిక / WORKSPACE ROLE' : 'WORKSPACE SELECTION'}
          </Text>

          {/* Mining Officer Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.roleCard,
              { backgroundColor: colors.surface, borderColor: selectedRole === 'Officer' ? colors.primary : colors.border },
              selectedRole === 'Officer' && { borderWidth: 2 },
            ]}
            onPress={() => setSelectedRole('Officer')}
          >
            <View style={styles.roleCardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <UserCheck size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.cardTitle, { color: colors.text, fontSize: 16 }]}>
                  {language === 'te' ? 'ఫీల్డ్ మైనింగ్ అధికారి' : 'Mining Field Officer'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'బ్లాక్ నమోదు, ArUco కొలత ఫోటోలు, నష్టం తనిఖీ & రవాణా అనుమతి'
                    : 'Block capture, ArUco scale alignment, defect inspection & dispatch'}
                </Text>
              </View>
              {selectedRole === 'Officer' && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Check size={14} color="#FFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Administrative Director Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.roleCard,
              { backgroundColor: colors.surface, borderColor: selectedRole === 'Admin' ? colors.accent : colors.border },
              selectedRole === 'Admin' && { borderWidth: 2 },
            ]}
            onPress={() => setSelectedRole('Admin')}
          >
            <View style={styles.roleCardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.accent + '20' }]}>
                <Shield size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.cardTitle, { color: colors.text, fontSize: 16 }]}>
                  {language === 'te' ? 'గనుల శాఖ డైరెక్టర్ / అడ్మిన్' : 'Administrative Director'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'క్వారీ పర్యవేక్షణ, సీనరేజ్ ఆదాయం మరియు నిబంధనల ఆడిట్'
                    : 'Quarry atlas, seigniorage royalty governance & compliance audit'}
                </Text>
              </View>
              {selectedRole === 'Admin' && (
                <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                  <Check size={14} color="#FFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Experience Mode Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'యూజర్ ఇంటర్‌ఫేస్ విధానం' : 'INTERFACE MODE'}
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.modeCard,
                { backgroundColor: colors.surface, borderColor: selectedMode ? colors.primary : colors.border },
                selectedMode && { borderWidth: 2 },
              ]}
              onPress={() => setSelectedMode(true)}
            >
              <Compass size={20} color={selectedMode ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeTitle, { color: selectedMode ? colors.primary : colors.text }]}>
                {language === 'te' ? 'సులభ విధానం' : 'Simple Mode'}
              </Text>
              <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                {language === 'te' ? 'పెద్ద బటన్లు, స్పష్టమైన సూచనలు' : 'Large buttons, plain language'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.modeCard,
                { backgroundColor: colors.surface, borderColor: !selectedMode ? colors.accent : colors.border },
                !selectedMode && { borderWidth: 2 },
              ]}
              onPress={() => setSelectedMode(false)}
            >
              <Sparkles size={20} color={!selectedMode ? colors.accent : colors.textSecondary} />
              <Text style={[styles.modeTitle, { color: !selectedMode ? colors.accent : colors.text }]}>
                {language === 'te' ? 'ఇంజనీరింగ్' : 'Engineering'}
              </Text>
              <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                {language === 'te' ? 'పూర్తి 3D పారామితులు & వివరాలు' : 'Full 3D telemetry & depth analysis'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enter Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryEnterBtn, { backgroundColor: colors.primary }]}
          onPress={handleEnterWorkspace}
        >
          <Text style={styles.primaryEnterText}>
            {language === 'te' ? 'కార్యక్షేత్రంలోకి ప్రవేశించండి' : 'Enter Granite Workspace'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.zeroAuthNote, { color: colors.textMuted }]}>
          {language === 'te'
            ? 'ప్రభుత్వ ప్రదర్శన కొరకు సిద్ధంగా ఉంది • పాస్‌వర్డ్ అవసరం లేదు'
            : 'Government Demonstration Prototype • No Password Barrier Required'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  brandHeader: { marginBottom: spacing.lg },
  emblemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  govBadge: { fontSize: 11, fontWeight: '700', marginLeft: spacing.xs, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xs },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.xs, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pillBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, fontWeight: '700' },
  roleCard: { padding: spacing.md, borderRadius: 14, borderWidth: 1, marginBottom: spacing.sm },
  roleCardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeCard: { flex: 1, padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  modeTitle: { fontSize: 14, fontWeight: '700', marginTop: spacing.xs },
  modeDesc: { fontSize: 11, marginTop: 2 },
  primaryEnterBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryEnterText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  zeroAuthNote: { textAlign: 'center', fontSize: 11, marginTop: spacing.sm },
});
