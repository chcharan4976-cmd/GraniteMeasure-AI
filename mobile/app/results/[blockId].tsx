import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
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
import {
  getBlockMeasurement,
  MeasurementData,
  listAnalysisJobs,
  AnalysisJobStatus,
  recordPhysicalReference,
} from '../../src/api/images';
import { getBlockWorkspace, getBlock, GraniteBlockItem } from '../../src/api/blocks';
import { AlertTriangle, Ruler, CheckCircle2, X } from 'lucide-react-native';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60; // 3 minutes maximum

export default function ResultsScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language } = useTranslation();

  const [measurement, setMeasurement] = useState<MeasurementData | null>(null);
  const [block, setBlock] = useState<GraniteBlockItem | any | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Manual reference modal
  const [showRefModal, setShowRefModal] = useState(false);
  const [tapeLength, setTapeLength] = useState('');
  const [tapeBreadth, setTapeBreadth] = useState('');
  const [tapeHeight, setTapeHeight] = useState('');
  const [submittingRef, setSubmittingRef] = useState(false);

  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const isTerminal = (meas: MeasurementData | null, job: AnalysisJobStatus | null): boolean => {
    if (meas && (meas.status === 'MEASURED' || meas.status === 'ESTIMATED' || meas.status === 'FAILED')) return true;
    if (job && (job.status === 'COMPLETED' || job.status === 'FAILED')) return true;
    return false;
  };

  // Fetch current measurement, block data, and latest job status
  const fetchResults = async (): Promise<{ meas: MeasurementData | null; job: AnalysisJobStatus | null }> => {
    try {
      setErrorMsg(null);
      const [measData, blockData] = await Promise.all([
        getBlockMeasurement(blockId as string).catch(() => null),
        getBlockWorkspace(blockId as string).catch(async () => {
          return await getBlock(blockId as string).catch(() => null);
        }),
      ]);

      if (isMountedRef.current) {
        setMeasurement(measData);
        setBlock(blockData);
      }

      let latestJob: AnalysisJobStatus | null = null;
      try {
        const jobs = await listAnalysisJobs(blockId as string);
        if (jobs && jobs.length > 0) {
          latestJob = jobs[jobs.length - 1];
          if (isMountedRef.current) {
            setJobStatus(latestJob);
          }
        }
      } catch {
        // Supplemental job query
      }

      return { meas: measData, job: latestJob };
    } catch (err: any) {
      console.warn('Error fetching results:', err);
      if (isMountedRef.current) {
        setErrorMsg(
          err?.response?.status === 404
            ? 'No measurement exists for this block yet.'
            : 'Failed to load measurement data. Check your connection.'
        );
      }
      return { meas: null, job: null };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const scheduleNextPoll = () => {
    clearPoll();
    if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
      if (isMountedRef.current) setPolling(false);
      return;
    }

    pollTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      pollAttemptsRef.current += 1;
      const { meas, job } = await fetchResults();
      if (!isMountedRef.current) return;

      if (isTerminal(meas, job)) {
        setPolling(false);
      } else {
        scheduleNextPoll();
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      const { meas, job } = await fetchResults();
      if (isMountedRef.current && !isTerminal(meas, job)) {
        setPolling(true);
        pollAttemptsRef.current = 0;
        scheduleNextPoll();
      } else if (isMountedRef.current) {
        setPolling(false);
      }
    })();

    return () => {
      isMountedRef.current = false;
      clearPoll();
    };
  }, [blockId]);

  const handleSaveTapeReference = async () => {
    if (!tapeLength || !tapeBreadth || !tapeHeight) {
      Alert.alert('Required', 'Please enter Length, Breadth, and Height in cm.');
      return;
    }
    setSubmittingRef(true);
    try {
      await recordPhysicalReference(blockId as string, {
        tape_length_cm: parseFloat(tapeLength),
        tape_breadth_cm: parseFloat(tapeBreadth),
        tape_height_cm: parseFloat(tapeHeight),
        recorded_by: 'Field Officer',
      });
      setShowRefModal(false);
      setTapeLength('');
      setTapeBreadth('');
      setTapeHeight('');
      Alert.alert(
        language === 'te' ? 'ధృవీకరించబడింది' : 'Reference Recorded',
        language === 'te'
          ? 'మాన్యువల్ టేప్ కొలతలు భద్రపరచబడ్డాయి. AI కొలతలతో పోల్చబడింది.'
          : 'Physical manual reference saved. Metric scale cross-referenced against your tape measurements.'
      );
      await fetchResults();
    } catch (err: any) {
      Alert.alert(
        language === 'te' ? 'లోపం' : 'Error',
        err?.response?.data?.detail || err.message || 'Could not record reference.'
      );
    } finally {
      setSubmittingRef(false);
    }
  };

  const isCalibrated = measurement?.calibration_status === 'CALIBRATED';
  const hasDimensions = measurement && measurement.length_cm != null;
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Measurement Results" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchResults();
            }}
            tintColor={colors.primary}
          />
        }
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
            <StatusBadge status={(measurement?.status as any) || (polling ? 'ANALYZING' : 'ESTIMATED')} />
          </View>
        </Card>

        {/* Calibration Warning & CTA Card: Shown whenever NOT_CALIBRATED */}
        {!isCalibrated && (
          <View style={{ marginTop: spacing.md }}>
            <View
              style={[
                styles.calibrationWarningCard,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
                  borderColor: '#f59e0b',
                },
              ]}
            >
              <View style={styles.calibWarningHeader}>
                <AlertTriangle color="#d97706" size={20} />
                <Text style={[styles.calibWarningTitle, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                  {language === 'te' ? 'కొలత రిఫరెన్స్ అవసరం' : 'Scale Reference Required'}
                </Text>
              </View>
              <Text style={[styles.calibWarningBody, { color: isDark ? '#e5e7eb' : '#78350f' }]}>
                {language === 'te'
                  ? 'కొలతకు ఖచ్చితమైన కొలత రిఫరెన్స్ అవసరం. క్యాలిబ్రేట్ చేసిన ArUco మార్కర్‌ను జోడించండి లేదా మాన్యువల్ టేప్ కొలతలను నమోదు చేయండి.'
                  : 'Measurement needs a known-size reference. Add a calibrated marker or an appropriate manually measured reference.'}
              </Text>

              <TouchableOpacity
                style={[styles.addRefBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowRefModal(true)}
              >
                <Ruler size={16} color="#000" />
                <Text style={styles.addRefBtnText}>
                  {language === 'te' ? 'కొలత రిఫరెన్స్‌ను జోడించండి' : 'Add Measurement Reference'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3D Principal Dimensions Card: Shown when dimensions are available */}
        {hasDimensions ? (
          <>
            <View style={{ marginTop: spacing.md }}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
                    Principal Metric Dimensions
                  </Text>
                  <View
                    style={[
                      styles.calibrationBadge,
                      {
                        backgroundColor: isCalibrated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isCalibrated ? colors.primary : '#f59e0b',
                        fontWeight: '700',
                        fontSize: 10,
                      }}
                    >
                      {isCalibrated ? 'ARUCO CALIBRATED' : 'UNCALIBRATED ESTIMATE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.dimensionsGrid}>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('length')} value={measurement!.length_cm!} unit="cm" />
                  </View>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('breadth')} value={measurement!.breadth_cm!} unit="cm" />
                  </View>
                  <View style={styles.dimItem}>
                    <MeasurementDisplay label={t('height')} value={measurement!.height_cm!} unit="cm" />
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
                      {measurement!.volume_m3?.toFixed(3)} <Text style={{ fontSize: 18 }}>m³</Text>
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      Commercial statutory volume
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Density-estimated mass</Text>
                    <Text style={[typography.heroMeasurement, typography.mono, { color: colors.accent }]}>
                      {(measurement!.estimated_mass_mt ?? measurement!.weight_mt)?.toFixed(2)} <Text style={{ fontSize: 18 }}>MT</Text>
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      Assumed 2,750 kg/m³
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
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Calibration Status:</Text>
                  <Text
                    style={[
                      typography.body,
                      {
                        color: isCalibrated ? colors.primary : '#f59e0b',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {measurement!.calibration_status || 'NOT_CALIBRATED'}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Evidence label:</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {measurement!.confidence_label || 'NONE'}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Irregular volume:</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {measurement!.irregular_volume_status || 'IRREGULAR_VOLUME_UNAVAILABLE'}
                  </Text>
                </View>

                {measurement!.reconstructed_points !== undefined && (
                  <View style={styles.metaRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Triangulated 3D Points:</Text>
                    <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                      {measurement!.reconstructed_points} points
                    </Text>
                  </View>
                )}

                {measurement!.usable_images !== undefined && (
                  <View style={styles.metaRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Usable Overlapping Views:</Text>
                    <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                      {measurement!.usable_images} images
                    </Text>
                  </View>
                )}

                {measurement!.warnings && measurement!.warnings.length > 0 && (
                  <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' }]}>
                    <AlertTriangle color="#d97706" size={16} />
                    <Text style={[typography.caption, { color: '#d97706', marginLeft: spacing.xs, flex: 1 }]}>
                      {measurement!.warnings[0]}
                    </Text>
                  </View>
                )}
              </Card>
            </View>
          </>
        ) : (
          /* When dimensions not yet generated */
          <View style={{ marginTop: spacing.md }}>
            <Card style={{ alignItems: 'center', padding: spacing.xl }}>
              {polling ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <AlertTriangle color="#f59e0b" size={40} />
              )}
              <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.md }]}>
                {polling ? '3D Photogrammetry Reconstructing…' : 'Measurement Pending'}
              </Text>
              {progressStep ? (
                <Text style={[typography.body, { color: colors.primary, marginTop: spacing.xs, fontWeight: '600' }]}>
                  {progressStep}
                </Text>
              ) : null}
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                {errorMsg ||
                  (polling
                    ? 'Orbital photo feature matching and metric 3D fit is running. Updates automatically.'
                    : pollTimedOut
                    ? 'Reconstruction is taking longer than expected. Tap refresh to check status.'
                    : 'Photographs uploaded. Tap refresh to check if reconstruction has completed, or add a measurement reference below.')}
              </Text>

              <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
                <Button
                  title="Refresh Analysis"
                  onPress={() => {
                    setRefreshing(true);
                    fetchResults();
                  }}
                  variant="outline"
                />
                <Button
                  title="Add Measurement Reference"
                  variant="secondary"
                  onPress={() => setShowRefModal(true)}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Inspect Damage Intelligence"
            variant="primary"
            onPress={() => router.push(`/damage/${blockId}`)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="Calculate Seigniorage Assessment"
            variant="outline"
            onPress={() => router.push(`/seigniorage/${blockId}`)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="View Full Auditable Report"
            variant="secondary"
            onPress={() => router.push(`/report/${blockId}`)}
          />
        </View>
      </ScrollView>

      {/* Manual Tape Measurement Reference Modal */}
      <Modal visible={showRefModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ruler size={20} color={colors.primary} />
                <Text style={[typography.cardTitle, { color: colors.text }]}>
                  {language === 'te' ? 'భౌతిక టేప్ కొలతలు' : 'Add Measurement Reference'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRefModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              {language === 'te'
                ? 'క్వారీలో కొలిచిన వాస్తవ కొలతలను సెంటీమీటర్లలో నమోదు చేయండి. ఇది AI ఫోటోగ్రామెట్రీ స్కేల్‌ను ధృవీకరిస్తుంది.'
                : 'Enter physical tape measurements in centimetres. This serves as ground-truth scale reference for metric calibration.'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Length (cm)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                placeholder="e.g. 280.0"
                placeholderTextColor={colors.textSecondary}
                value={tapeLength}
                onChangeText={setTapeLength}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Breadth / Width (cm)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                placeholder="e.g. 160.0"
                placeholderTextColor={colors.textSecondary}
                value={tapeBreadth}
                onChangeText={setTapeBreadth}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                placeholder="e.g. 140.0"
                placeholderTextColor={colors.textSecondary}
                value={tapeHeight}
                onChangeText={setTapeHeight}
              />
            </View>

            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <Button
                title={submittingRef ? 'Saving Reference...' : 'Save Scale Reference'}
                onPress={handleSaveTapeReference}
                disabled={submittingRef}
                variant="primary"
              />
              <View style={{ height: spacing.xs }} />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowRefModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimensionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
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
  calibrationWarningCard: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  calibWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calibWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  calibWarningBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  addRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: 6,
  },
  addRefBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  calibrationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actions: { marginTop: spacing.xl, marginBottom: spacing.xxl },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inputGroup: {
    marginVertical: 6,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    gap: spacing.xs,
  },
});
