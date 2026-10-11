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
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getQuarries, QuarryItem } from '../../src/api/quarries';
import { createBlock } from '../../src/api/blocks';
import { MapPin, RefreshCw, Check, Camera } from 'lucide-react-native';

const GRANITE_CATEGORIES = [
  'Black Galaxy',
  'Other Black Granite',
  'Specified Colour Granite Group 1',
  'Specified Colour Granite Group 2',
  'Other Colour Granite',
];

export default function NewBlockScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { activeQuarryId, activeQuarryName } = useAuthStore();

  const [quarries, setQuarries] = useState<QuarryItem[]>([]);
  const [selectedQuarryId, setSelectedQuarryId] = useState<number | null>(activeQuarryId || null);
  const [colorGroup, setColorGroup] = useState('Black Galaxy');
  const [blockType, setBlockType] = useState<'RAW' | 'PROCESSED'>('RAW');
  const [identifier, setIdentifier] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingQuarries, setFetchingQuarries] = useState(true);

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'ok' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const data = await getQuarries();
        setQuarries(data);
        if (data.length > 0 && !selectedQuarryId) {
          setSelectedQuarryId(data[0].id);
        }
      } catch (err) {
        console.warn('Could not fetch quarries:', err);
      } finally {
        setFetchingQuarries(false);
      }
    })();

    // Auto generate preliminary block code
    const randCode = `BLK-${Math.floor(1000 + Math.random() * 9000)}`;
    setIdentifier(randCode);

    acquireGps();
  }, []);

  const acquireGps = async () => {
    setGpsStatus('fetching');
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        setGpsStatus('denied');
        return;
      }
      // Speed first: cached location
      let pos = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setGpsStatus('ok');
    } catch {
      setGpsStatus('unavailable');
    }
  };

  const handleCreateBlock = async () => {
    if (!selectedQuarryId) {
      Alert.alert('Required', 'Please select a quarry pit.');
      return;
    }

    try {
      setLoading(true);
      const newBlock = await createBlock({
        quarry_id: selectedQuarryId,
        color_group: colorGroup,
        identifier: identifier.trim() || undefined,
        block_type: blockType,
        gps_latitude: gpsCoords?.lat ?? null,
        gps_longitude: gpsCoords?.lon ?? null,
        observations: observations.trim() || undefined,
      });

      Alert.alert(
        'Block Registered',
        `Block ${newBlock.identifier} has been registered successfully. Proceed to multi-view capture?`,
        [
          {
            text: 'View Details',
            onPress: () => router.replace(`/block/${newBlock.id}`),
          },
          {
            text: 'Start Capture',
            style: 'default',
            onPress: () => router.replace(`/capture/${newBlock.id}`),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Registration Failed', e.response?.data?.detail || e.message || 'Could not register block');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('registerBlock')} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Quarry Selector */}
        <Card style={styles.sectionCard}>
          <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
            {t('activeQuarry')}
          </Text>
          {fetchingQuarries ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {quarries.map((q) => {
                const isSelected = selectedQuarryId === q.id;
                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedQuarryId(q.id)}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: isSelected ? '#FFF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {q.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Card>

        {/* Block Identifier & Type */}
        <Card style={styles.sectionCard}>
          <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
            {t('blockIdentifier')}
          </Text>
          <TextInput
            style={[
              styles.input,
              typography.mono,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            placeholder="e.g. BLK-8421"
            placeholderTextColor={colors.textSecondary}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="characters"
          />

          <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            {t('processingStage')}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: blockType === 'RAW' ? colors.primary : colors.surface,
                  borderColor: blockType === 'RAW' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBlockType('RAW')}
            >
              <Text style={{ color: blockType === 'RAW' ? '#FFF' : colors.text, fontWeight: '700' }}>
                {t('raw')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: blockType === 'PROCESSED' ? colors.primary : colors.surface,
                  borderColor: blockType === 'PROCESSED' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBlockType('PROCESSED')}
            >
              <Text style={{ color: blockType === 'PROCESSED' ? '#FFF' : colors.text, fontWeight: '700' }}>
                {t('processed')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Granite Category */}
        <Card style={styles.sectionCard}>
          <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
            {t('graniteCategory')}
          </Text>
          <View style={styles.categoryGrid}>
            {GRANITE_CATEGORIES.map((cat) => {
              const isSelected = colorGroup === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setColorGroup(cat)}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? '#FFF' : colors.text, fontWeight: isSelected ? '700' : '400' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* GPS Capture Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.gpsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin color={colors.primary} size={20} />
              <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.xs }]}>
                {t('gpsCoordinates')}
              </Text>
            </View>
            <TouchableOpacity onPress={acquireGps} style={styles.refreshGpsBtn}>
              <RefreshCw color={colors.primary} size={16} style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Acquire</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            {gpsStatus === 'fetching' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Obtaining GPS fix...</Text>
              </View>
            ) : gpsCoords ? (
              <View>
                <Text style={[typography.cardTitle, typography.mono, { color: colors.success }]}>
                  {gpsCoords.lat.toFixed(5)}°N, {gpsCoords.lon.toFixed(5)}°E
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  ✓ Geotagged to block quarry location
                </Text>
              </View>
            ) : (
              <Text style={[typography.caption, { color: colors.warning }]}>
                GPS not available. You can continue or tap Acquire to retry.
              </Text>
            )}
          </View>
        </Card>

        {/* Observations / Notes */}
        <Card style={styles.sectionCard}>
          <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
            Field Observations & Notes
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, height: 70 },
            ]}
            placeholder="e.g. Visual face crack along left edge; ArUco marker #4 placed on top surface."
            placeholderTextColor={colors.textSecondary}
            value={observations}
            onChangeText={setObservations}
            multiline
          />
        </Card>

        {/* Submit Button */}
        <View style={{ marginTop: spacing.md, marginBottom: spacing.xxl }}>
          <Button
            title={loading ? t('loading') : t('save')}
            onPress={handleCreateBlock}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  sectionCard: { marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  gpsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshGpsBtn: { flexDirection: 'row', alignItems: 'center' },
});
