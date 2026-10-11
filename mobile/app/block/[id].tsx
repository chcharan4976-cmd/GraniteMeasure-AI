import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { getBlock, GraniteBlockItem } from '../../src/api/blocks';
import { MapPin } from 'lucide-react-native';

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  const [block, setBlock] = useState<GraniteBlockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBlock(id as string);
        setBlock(data);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          setLoadError('Block not found on server.');
        } else if (!err.response) {
          setLoadError('Could not reach the backend. Check your network connection.');
        } else {
          setLoadError(`Server error (${status}). Please try again.`);
        }
        console.warn('Could not load block:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!block) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Block Details" />
        <View style={styles.content}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {loadError || 'Block not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMeasured = block.status === 'MEASURED' || block.measurement !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={block.identifier} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Summary */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Block Identifier</Text>
              <Text style={[typography.heroMeasurement, typography.mono, { color: colors.text }]}>
                {block.identifier}
              </Text>
            </View>
            <StatusBadge status={block.status as any} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Granite Category</Text>
              <Text style={[typography.cardTitle, { color: colors.accent, marginTop: 2 }]}>{block.color_group}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Processing Stage</Text>
              <Text style={[typography.cardTitle, { color: colors.text, marginTop: 2 }]}>{block.block_type || 'RAW'}</Text>
            </View>
          </View>
          {block.gps_latitude && (
            <View style={[styles.gpsRow, { marginTop: spacing.md }]}>
              <MapPin color={colors.textSecondary} size={16} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                GPS: {block.gps_latitude.toFixed(4)}°N, {block.gps_longitude?.toFixed(4)}°E (Device GPS)
              </Text>
            </View>
          )}
        </Card>

        {/* Measurement section */}
        {block.measurement && (
          <View style={{ marginTop: spacing.md }}>
            <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={[typography.cardTitle, { color: colors.text }]}>Recovered Dimensions</Text>
                <StatusBadge status={block.measurement.status} />
              </View>
              {block.measurement.length_cm != null ? (
                <>
                  <View style={[styles.dimensionRow, { marginTop: spacing.md }]}>
                    <View style={styles.dimBox}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Length</Text>
                      <Text style={[typography.sectionTitle, typography.mono, { color: colors.text }]}>
                        {block.measurement.length_cm.toFixed(1)} cm
                      </Text>
                    </View>
                    <View style={styles.dimBox}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Breadth</Text>
                      <Text style={[typography.sectionTitle, typography.mono, { color: colors.text }]}>
                        {block.measurement.breadth_cm != null ? `${block.measurement.breadth_cm.toFixed(1)} cm` : '—'}
                      </Text>
                    </View>
                    <View style={styles.dimBox}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Height</Text>
                      <Text style={[typography.sectionTitle, typography.mono, { color: colors.text }]}>
                        {block.measurement.height_cm != null ? `${block.measurement.height_cm.toFixed(1)} cm` : '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.rowBetween}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Bounding-box volume</Text>
                    <Text style={[typography.cardTitle, typography.mono, { color: colors.primary }]}>
                      {block.measurement.volume_m3 != null ? `${block.measurement.volume_m3.toFixed(3)} m³` : '—'}
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    Bounding-box volume is not irregular granite volume.
                  </Text>
                </>
              ) : (
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  Centimetre dimensions withheld ({block.measurement.calibration_status || 'NOT_CALIBRATED'}).
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isMeasured ? (
            <>
              <Button
                title="View Measurement Results"
                onPress={() => router.push(`/results/${block.id}`)}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                title="Seigniorage Assessment"
                variant="outline"
                onPress={() => router.push(`/seigniorage/${block.id}`)}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                title="Auditable Report"
                variant="secondary"
                onPress={() => router.push(`/report/${block.id}`)}
              />
            </>
          ) : (
            <>
              <Button
                title="Start Multi-View Camera Capture"
                onPress={() => router.push(`/capture/${block.id}`)}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, marginVertical: spacing.md },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  gpsRow: { flexDirection: 'row', alignItems: 'center' },
  dimensionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dimBox: { flex: 1, alignItems: 'center' },
  actions: { marginTop: spacing.xl, marginBottom: spacing.xxl },
});
