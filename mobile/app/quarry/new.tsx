import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { createQuarry } from '../../src/api/quarries';
import { QuarryAtlasIcon } from '../../src/components/DomainIcons';
import {
  ArrowLeft,
  MapPin,
  Check,
  RefreshCw,
  FileText,
  Building,
  Save,
} from 'lucide-react-native';

const AP_DISTRICTS = [
  'Prakasam',
  'Khammam',
  'Srikakulam',
  'Chittoor',
  'YSR Kadapa',
  'Guntur',
  'Kurnool',
  'Ananthapuramu',
];

const GRANITE_VARIETIES = [
  'Black Galaxy (Chimakurthy)',
  'Jet Black (Fine Grain)',
  'Steel Grey Granite',
  'Blue Star Granite',
  'Khammam Black',
  'Srikakulam Blue',
  'Multi-Colour Granite',
];

export default function NewQuarryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t } = useTranslation();
  const { setActiveQuarry } = useAuthStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [leaseNumber, setLeaseNumber] = useState('');
  const [leaseHolder, setLeaseHolder] = useState('');
  const [district, setDistrict] = useState('Prakasam');
  const [mandal, setMandal] = useState('Chimakurthy');
  const [village, setVillage] = useState('');
  const [graniteCategory, setGraniteCategory] = useState('Black Galaxy (Chimakurthy)');
  const [status, setStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // GPS Coordinates
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'ok' | 'denied'>('idle');

  useEffect(() => {
    // Generate suggested code
    const randCode = `CHK-Q-${Math.floor(10 + Math.random() * 90)}`;
    setCode(randCode);
    acquireGps();
  }, []);

  const acquireGps = async () => {
    setGpsStatus('fetching');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsStatus('denied');
        return;
      }
      let pos = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setGpsStatus('ok');
    } catch {
      setGpsStatus('denied');
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert(
        language === 'te' ? 'అవసరమైన సమాచారం' : 'Required',
        language === 'te' ? 'దయచేసి క్వారీ పేరును నమోదు చేయండి.' : 'Please enter the quarry concession name.'
      );
      return;
    }
    if (!mandal.trim()) {
      Alert.alert('Required', 'Please enter Mandal.');
      return;
    }

    try {
      setLoading(true);
      const newQuarry = await createQuarry({
        name: name.trim(),
        code: code.trim() || undefined,
        lease_reference: leaseNumber.trim() || undefined,
        lease_number: leaseNumber.trim() || undefined,
        lease_holder: leaseHolder.trim() || undefined,
        district: district.trim(),
        mandal: mandal.trim(),
        village: village.trim() || undefined,
        location: `${village.trim() ? village.trim() + ', ' : ''}${mandal.trim()} Mandal`,
        granite_category: graniteCategory,
        gps_latitude: gps?.lat ?? undefined,
        gps_longitude: gps?.lon ?? undefined,
        is_active: status === 'ACTIVE',
        status: status,
        notes: notes.trim() || undefined,
      });

      // Set as active quarry for capture sessions
      setActiveQuarry(newQuarry.id, newQuarry.name);

      Alert.alert(
        language === 'te' ? 'క్వారీ నమోదైంది' : 'Quarry Registered',
        language === 'te'
          ? `"${newQuarry.name}" విజయవంతంగా నమోదైంది మరియు ప్రస్తుత వర్క్‌స్పేస్ కొరకు ఎంపికైంది.`
          : `Quarry "${newQuarry.name}" has been registered and set as your active capture quarry.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        'Registration Failed',
        e.response?.data?.detail || e.message || 'Could not register quarry lease'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.pageTitle, { color: colors.text, fontSize: 18 }]}>
            {t('registerQuarry')}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {language === 'te' ? 'ఆంధ్రప్రదేశ్ మైనింగ్ లీజు నమోదు' : 'AP Mining Lease Registry'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Section 1: Quarry Identification */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            {language === 'te' ? '1. క్వారీ వివరాలు' : '1. Quarry Identification'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'క్వారీ పేరు *' : 'Quarry Concession Name *'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Chimakurthy Galaxy Leases #1"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'క్వారీ కోడ్' : 'Quarry Code'}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. CHK-GLX-01"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={setCode}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'స్థితి' : 'Operating Status'}
              </Text>
              <View style={styles.statusPillRow}>
                {(['ACTIVE', 'UNDER_REVIEW'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.8}
                    style={[
                      styles.statusPill,
                      status === st
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                    onPress={() => setStatus(st)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: status === st ? '#FFF' : colors.textSecondary }}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Statutory Lease Agreement */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.accent }]}>
            {language === 'te' ? '2. చట్టబద్ధమైన లీజు ఒప్పందం' : '2. Statutory Lease Agreement'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'లీజు ఒప్పంద సంఖ్య' : 'Lease Agreement Reference No.'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. AP-PRK-GNT-2023-014"
              placeholderTextColor={colors.textSecondary}
              value={leaseNumber}
              onChangeText={setLeaseNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'లీజుదారు / సంస్థ పేరు' : 'Lease Holder / Operator Name'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Galaxy Granites & Minerals Pvt Ltd"
              placeholderTextColor={colors.textSecondary}
              value={leaseHolder}
              onChangeText={setLeaseHolder}
            />
          </View>
        </View>

        {/* Section 3: Geographic Concession Fix */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            {language === 'te' ? '3. భౌగోళిక స్థానం & మ్యాపింగ్' : '3. Geographic Jurisdiction'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'జిల్లా' : 'District (Andhra Pradesh)'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {AP_DISTRICTS.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    district === dist
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => setDistrict(dist)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: district === dist ? '#FFF' : colors.text }}>
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'మండలం *' : 'Mandal *'}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Chimakurthy"
                placeholderTextColor={colors.textSecondary}
                value={mandal}
                onChangeText={setMandal}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'గ్రామం' : 'Village / Location'}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. R.L. Puram"
                placeholderTextColor={colors.textSecondary}
                value={village}
                onChangeText={setVillage}
              />
            </View>
          </View>

          {/* GPS Coordinate Box */}
          <View style={[styles.gpsBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={14} color={gps ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                  {language === 'te' ? 'GPS స్థాన నిర్ధారణ' : 'GPS Coordinates'}
                </Text>
              </View>
              {gps ? (
                <Text style={[typography.caption, typography.mono, { color: colors.primary, marginTop: 2 }]}>
                  {gps.lat.toFixed(5)}°N, {gps.lon.toFixed(5)}°E (Locked)
                </Text>
              ) : (
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {gpsStatus === 'fetching' ? 'Acquiring satellite fix...' : 'No GPS fix acquired'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.acquireBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
              onPress={acquireGps}
              disabled={gpsStatus === 'fetching'}
            >
              {gpsStatus === 'fetching' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <RefreshCw size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                    {gps ? 'Re-lock' : 'Acquire GPS'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Mineral Variety */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.accent }]}>
            {language === 'te' ? '4. గ్రానైట్ రకం' : '4. Granite Mineral Variety'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
            {GRANITE_VARIETIES.map((varName) => (
              <TouchableOpacity
                key={varName}
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  graniteCategory === varName
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => setGraniteCategory(varName)}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: graniteCategory === varName ? '#FFF' : colors.text }}>
                  {varName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {language === 'te' ? 'అదనపు గమనికలు' : 'Supporting Field Notes'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, height: 60, textAlignVertical: 'top' },
              ]}
              placeholder="e.g. Deep bench pit #4, quarry lease valid through 2033"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Save size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>
                {language === 'te' ? 'క్వారీని నమోదు చేయండి' : 'Register & Set as Active Quarry'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  inputGroup: { marginBottom: spacing.sm },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  textInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },
  rowInputs: { flexDirection: 'row', gap: spacing.sm },
  statusPillRow: { flexDirection: 'row', gap: 4, height: 42, alignItems: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  gpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  acquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
