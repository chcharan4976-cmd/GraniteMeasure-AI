import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { MeasurementDisplay } from '../../src/components/MeasurementDisplay';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getBlockMeasurement, MeasurementData, listAnalysisJobs, AnalysisJobStatus } from '../../src/api/images';
import { getBlock, GraniteBlockItem } from '../../src/api/blocks';
import { AlertTriangle } from 'lucide-react-native';

const POLL_INTERVAL_MS = 3000;  // 3 s between polls
const POLL_MAX_ATTEMPTS = 80;   // 4 min — backend JOB_TIMEOUT_SEC is 180 s; give a 60 s margin

export default function ResultsScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [measurement, setMeasurement] = useState<MeasurementData | null>(null);
  const [block, setBlock] = useState<GraniteBlockItem | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Fetch current measurement and the latest job status
  const fetchResults = async () => {
    try {
      setErrorMsg(null);
      const [measData, blockData] = await Promise.all([
        getBlockMeasurement(blockId as string).catch(() => null),
        getBlock(blockId as string).catch(() => null),
      ]);
      setMeasurement(measData);
      setBlock(blockData);

      // Also check latest job status for progress display
      try {
        const jobs = await listAnalysisJobs(blockId as string);
        if (jobs && jobs.length > 0) {
          setJobStatus(jobs[jobs.length - 1]);
        }
      } catch {
        // job status is supplemental — don't fail the whole screen
      }
    } catch (err: any) {
      console.warn('Error fetching results:', err);
      setErrorMsg(
        err?.response?.status === 404
          ? 'No measurement exists for this block yet.'
          : 'Failed to load measurement data. Check your connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Returns true when we know the job is done (either terminal job status OR measurement result)
  const isTerminal = (meas: MeasurementData | null, job: AnalysisJobStatus | null): boolean => {
    if (meas && (meas.status === 'MEASURED' || meas.status === 'ESTIMATED' || meas.status === 'FAILED')) return true;
    if (job && (job.status === 'COMPLETED' || job.status === 'FAILED')) return true;
    return false;
  };

  // Auto-poll while the job is still running
  const schedulePoll = () => {
    clearPoll();
    if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
      setPolling(false);
      return;
    }
    pollTimerRef.current = setTimeout(async () => {
      pollAttemptsRef.current += 1;
      await fetchResults();
      // Use functional updates to read current state without stale closure
      setJobStatus((currentJob) => {
        setMeasurement((currentMeas) => {
          if (isTerminal(currentMeas, currentJob)) {
            setPolling(false);
          } else {
            schedulePoll();
          }
          return currentMeas;
        });
        return currentJob;
      });
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    (async () => {
      await fetchResults();
      // Start polling — stop once job reaches terminal state
      setJobStatus((currentJob) => {
        setMeasurement((currentMeas) => {
          if (!isTerminal(currentMeas, currentJob)) {
            setPolling(true);
            pollAttemptsRef.current = 0;
            schedulePoll();
          }
          return currentMeas;
        });
        return currentJob;
      });
    })();
    return () => clearPoll();
  }, [blockId]);

  // Progress label shown while polling; also indicate if timed out
  const pollTimedOut = !polling && pollAttemptsRef.current >= POLL_MAX_ATTEMPTS;
  const progressStep = jobStatus?.current_step || (polling ? 'Processing…' : null);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading measurement evidence...
        </Text>
      </SafeAreaView>
    );
  }

  // Fallback if measurement failed or in progress
  const hasValidMeasurement =
    measurement &&
    measurement.length_cm !== null &&
    measurement.calibration_status === 'CALIBRATED';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Measurement Results" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchResults(); }} tintColor={colors.primary} />}
      >
        {/* Block & Status Banner */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Block Identifier</Text>
              <Text style={[typography.pageTitle, typography.mono, { color: colors.text }]}>
                {block?.identifier || `Block #${blockId}`}
              </Text>
              <Text style={[typography.caption, { color: colors.accent, marginTop: 2 }]}>
                {block?.color_group || 'Black Galaxy'}
              </Text>
            </View>
            <StatusBadge status={(measurement?.status as any) || 'ESTIMATED'} />
          </View>
        </Card>

        {/* 3D Principal Dimensions Card */}
        {hasValidMeasurement ? (
          <>
            <View style={{ marginTop: spacing.md }}>
              <Card>
                <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.md }]}>
                  Principal Metric Dimensions
                </Text>
                <View style={styles.dimensionsGrid}>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('length')} value={measurement.length_cm!} unit="cm" />
                  </View>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('breadth')} value={measurement.breadth_cm!} unit="cm" />
                  </View>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('height')} value={measurement.height_cm!} unit="cm" />
                  </View>
                </View>
              </Card>
            </View>

            {/* Volume & Tonnage Hero Card */}
            <View style={{ marginTop: spacing.md }}>
              <Card style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }}>
                <View style={styles.volumeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Bounding-box volume</Text>
                    <Text style={[typography.heroMeasurement, typography.mono, { color: colors.primary }]}>
                      {measurement.volume_m3?.toFixed(3)} <Text style={{ fontSize: 18 }}>m³</Text>
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      Not irregular stone volume
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Density-estimated mass</Text>
                    <Text style={[typography.heroMeasurement, typography.mono, { color: colors.accent }]}>
                      {(measurement.estimated_mass_mt ?? measurement.weight_mt)?.toFixed(2)} <Text style={{ fontSize: 18 }}>MT</Text>
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      Assumed 2,750 kg/m³ on bbox volume
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Metrology & Evidence Quality Card */}
            <View style={{ marginTop: spacing.md }}>
              <Card>
                <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
                  Photogrammetric Provenance
                </Text>

                <View style={styles.metaRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Calibration Marker:</Text>
                  <Text style={[typography.body, { color: measurement.calibration_status === 'CALIBRATED' ? colors.success : colors.warning, fontWeight: '600' }]}>
                    {measurement.calibration_status}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Evidence label:</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {measurement.confidence_label || 'NONE'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Irregular volume:</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {measurement.irregular_volume_status || 'IRREGULAR_VOLUME_UNAVAILABLE'}
                  </Text>
                </View>

                {measurement.reconstructed_points !== undefined && (
                  <View style={styles.metaRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Triangulated 3D Points:</Text>
                    <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                      {measurement.reconstructed_points} points
                    </Text>
                  </View>
                )}

                {measurement.usable_images !== undefined && (
                  <View style={styles.metaRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Usable Overlapping Views:</Text>
                    <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                      {measurement.usable_images} images
                    </Text>
                  </View>
                )}

                {measurement.warnings && measurement.warnings.length > 0 && (
                  <View style={[styles.warningBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
                    <AlertTriangle color={colors.warning} size={16} />
                    <Text style={[typography.caption, { color: colors.warning, marginLeft: spacing.xs, flex: 1 }]}>
                      {measurement.warnings[0]}
                    </Text>
                  </View>
                )}
              </Card>
            </View>
          </>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              {polling ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <AlertTriangle color={colors.warning} size={40} />
              )}
              <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.md }]}>
                {polling ? 'Reconstructing…' : 'Measurement Pending'}
              </Text>
              {progressStep ? (
                <Text style={[typography.body, { color: colors.primary, marginTop: spacing.xs }]}>
                  {progressStep}
                </Text>
              ) : null}
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                {errorMsg || (polling
                  ? 'Photogrammetric reconstruction is running. This screen updates automatically.'
                  : pollTimedOut
                  ? 'Reconstruction is taking longer than expected. Tap refresh to check manually.'
                  : 'Images have been captured. Tap refresh to check if reconstruction has completed.')}
              </Text>
              {!polling && (
                <View style={{ marginTop: spacing.lg, width: '100%' }}>
                  <Button title="Refresh Analysis" onPress={() => { setRefreshing(true); fetchResults(); }} variant="outline" />
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Calculate Seigniorage Assessment"
            onPress={() => router.push(`/seigniorage/${blockId}`)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="View Full Auditable Report"
            variant="outline"
            onPress={() => router.push(`/report/${blockId}`)}
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
  dimensionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dimItem: { flex: 1 },
  volumeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  actions: { marginTop: spacing.xl, marginBottom: spacing.xxl },
});
