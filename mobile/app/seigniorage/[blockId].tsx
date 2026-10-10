import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getBlockMeasurement } from '../../src/api/images';
import { getBlock, GraniteBlockItem } from '../../src/api/blocks';
import { calculateSeigniorage, SeigniorageResult } from '../../src/api/seigniorage';
import { IndianRupee, ShieldAlert, CheckCircle, Scale, FileText, ArrowRight } from 'lucide-react-native';

export default function SeigniorageScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [assessment, setAssessment] = useState<SeigniorageResult | null>(null);
  const [block, setBlock] = useState<GraniteBlockItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [measData, blockData] = await Promise.all([
          getBlockMeasurement(blockId as string).catch(() => null),
          getBlock(blockId as string).catch(() => null),
        ]);

        setBlock(blockData);

        const length = measData?.length_cm;
        const width = measData?.breadth_cm;
        const height = measData?.height_cm;
        const category = blockData?.color_group || 'Black Galaxy';
        const calibrated =
          measData?.calibration_status === 'CALIBRATED' &&
          length != null &&
          width != null &&
          height != null;

        if (!calibrated) {
          setAssessment(null);
          return;
        }

        const calc = await calculateSeigniorage({
          color_group: category,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          density_kg_m3: 2750.0,
          block_id: blockId as string,
          measurement_source: measData.status,
        });

        setAssessment(calc);
      } catch (err) {
        console.warn('Could not calculate seigniorage assessment:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [blockId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Evaluating statutory seigniorage assessment...
        </Text>
      </SafeAreaView>
    );
  }

  if (!assessment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t('seigniorage')} />
        <View style={styles.content}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Indicative seigniorage is withheld until a CALIBRATED measurement with centimetre dimensions exists. Placeholder dimensions are not used.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Indicative Seigniorage" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Assessment Card */}
        <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {assessment.color_group}
            </Text>
            <StatusBadge status={assessment.is_above_gangsaw ? 'MEASURED' : 'PARTIAL'} />
          </View>

          <Text style={[typography.sectionTitle, { color: colors.text, marginTop: spacing.xs }]}>
            {assessment.classification}
          </Text>

          <View style={styles.metricRow}>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Threshold Rule</Text>
              <Text style={[typography.body, { color: colors.text }]}>≥ 270 cm × 150 cm</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Applicable Rate</Text>
              <Text style={[typography.cardTitle, typography.mono, { color: colors.accent }]}>
                ₹{assessment.rate_per_mt} / MT
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Mass & Volume */}
          <View style={styles.rowBetween}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Calculated Volume</Text>
            <Text style={[typography.body, typography.mono, { color: colors.text }]}>
              {assessment.volume_m3.toFixed(3)} m³
            </Text>
          </View>

          <View style={[styles.rowBetween, { marginTop: spacing.xs }]}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Chargeable Tonnage</Text>
            <Text style={[typography.body, typography.mono, { color: colors.text }]}>
              {assessment.weight_mt.toFixed(3)} MT
            </Text>
          </View>

          <View style={[styles.rowBetween, { marginTop: spacing.xs }]}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Quantity Source</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {assessment.weight_source}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Total Fee Due */}
          <View style={styles.totalRow}>
            <View>
              <Text style={[typography.cardTitle, { color: colors.text }]}>Indicative Seigniorage</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Statutory Assessment
              </Text>
            </View>
            <Text style={[typography.heroMeasurement, typography.mono, { color: colors.primary }]}>
              ₹{assessment.indicative_seigniorage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </Card>

        {/* Regulatory Governance Details */}
        <View style={{ marginTop: spacing.md }}>
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.xs }]}>
              Rate Engine Specification
            </Text>
            <Text style={[typography.caption, typography.mono, { color: colors.accent }]}>
              {assessment.rate_version}
            </Text>

            <View style={[styles.disclaimerBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ShieldAlert color={colors.textSecondary} size={18} style={{ marginTop: 2 }} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
                {assessment.disclaimer}
              </Text>
            </View>
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Generate Official Audit Report"
            onPress={() => router.push(`/report/${blockId}`)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="Return to Command Center"
            variant="outline"
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  divider: { height: 1, marginVertical: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs },
  disclaimerBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  actions: { marginTop: spacing.xl, marginBottom: spacing.xxl },
});
