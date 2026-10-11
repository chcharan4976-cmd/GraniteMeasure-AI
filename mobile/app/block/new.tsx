import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { getQuarries, QuarryItem } from '../../src/api/quarries';
import { createBlock } from '../../src/api/blocks';
import { MapPin } from 'lucide-react-native';

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

  const [quarries, setQuarries] = useState<QuarryItem[]>([]);
  const [selectedQuarryId, setSelectedQuarryId] = useState<number | null>(null);
  const [colorGroup, setColorGroup] = useState('Black Galaxy');
  const [blockType, setBlockType] = useState<'RAW' | 'PROCESSED'>('RAW');
  const [identifier, setIdentifier] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingQuarries, setFetchingQuarries] = useState(true);

  // GPS state — null means not yet acquired
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'ok' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const data = await getQuarries();
        setQuarries(data);
        if (data.length > 0) {
          setSelectedQuarryId(data[0].id);
        }
      } catch (err) {
        console.warn('Could not fetch quarries:', err);
      } finally {
        setFetchingQuarries(false);
      }
    })();

    // Request GPS on screen mount so it's ready by the time the officer taps submit
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
      // Use lastKnownPosition first for speed; fall back to a fresh fix
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
      Alert.alert('Required', 'Please select an authorized quarry.');
      return;
    }

    // If GPS is still fetching, wait briefly; if denied/unavailable, warn but allow
    if (gpsStatus === 'fetching') {
      Alert.alert('Locating…', 'GPS fix in progress. Please wait a moment and try again.');
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

      router.replace(`/capture/${newBlock.id}`);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.detail || err.message || 'Could not register block');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Register Granite Block" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Quarry Selection */}
        <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
          Quarry Lease & Location
        </Text>
        {fetchingQuarries ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : (
          <View style={styles.chipRow}>
            {quarries.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedQuarryId === q.id ? colors.primary : colors.surface,
                    borderColor: selectedQuarryId === q.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedQuarryId(q.id)}
              >
                <Text
                  style={[
                    typography.body,
                    { color: selectedQuarryId === q.id ? '#FFF' : colors.text, fontWeight: '600' },
                  ]}
                >
                  {q.name}
                </Text>
                {q.district && (
                  <Text style={[typography.caption, { color: selectedQuarryId === q.id ? '#EEF' : colors.textSecondary }]}>
                    {q.district}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Granite Category */}
        <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
          Granite Category (Rate Classification)
        </Text>
        <View style={styles.chipRow}>
          {GRANITE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: colorGroup === cat ? colors.accent : colors.surface,
                  borderColor: colorGroup === cat ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setColorGroup(cat)}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colorGroup === cat ? '#FFF' : colors.text, fontWeight: '600' },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Block Type */}
        <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
          Stage of Extraction
        </Text>
        <View style={styles.typeRow}>
          {(['RAW', 'PROCESSED'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: blockType === type ? colors.primary + '20' : colors.surface,
                  borderColor: blockType === type ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBlockType(type)}
            >
              <Text
                style={[
                  typography.cardTitle,
                  { color: blockType === type ? colors.primary : colors.text },
                ]}
              >
                {type === 'RAW' ? 'Raw Quarry Block' : 'Dressed / Processed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* GPS Status */}
        <View style={[styles.gpsRow, { marginTop: spacing.md, marginBottom: spacing.xs }]}>
          <MapPin color={
            gpsStatus === 'ok' ? colors.success :
            gpsStatus === 'fetching' ? colors.primary :
            colors.warning
          } size={16} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs, flex: 1 }]}>
            {gpsStatus === 'ok' && gpsCoords
              ? `GPS: ${gpsCoords.lat.toFixed(5)}°N, ${gpsCoords.lon.toFixed(5)}°E`
              : gpsStatus === 'fetching'
              ? 'Acquiring GPS position…'
              : gpsStatus === 'denied'
              ? 'Location permission denied — no GPS will be recorded'
              : gpsStatus === 'unavailable'
              ? 'GPS unavailable — no location will be recorded'
              : 'Tap to acquire GPS'}
          </Text>
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'idle') && (
            <TouchableOpacity onPress={acquireGps}>
              <Text style={[typography.caption, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Custom Identifier */}
        <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
          Block Identifier (Optional)
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="e.g. BLK-2026-CHM-042 (Auto-assigned if empty)"
          placeholderTextColor={colors.textSecondary}
          value={identifier}
          onChangeText={setIdentifier}
        />

        {/* Observations */}
        <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
          Field Observations
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, height: 72 }]}
          placeholder="e.g. Natural corner breakage on rear face, ArUco marker #1 placed on top face."
          placeholderTextColor={colors.textSecondary}
          value={observations}
          onChangeText={setObservations}
          multiline
        />

        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
          <Button
            title={loading ? 'Registering...' : 'Proceed to Camera Capture'}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center' },
});
