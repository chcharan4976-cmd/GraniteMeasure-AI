import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import {
  getBlockDamageReport,
  analyzeBlockDamage,
  BlockDamageReport,
  DefectItem,
} from '../../src/api/damage';
import {
  FractureIntelligenceIcon,
  ShieldEmblemIcon,
  CutLabIcon,
} from '../../src/components/DomainIcons';
import {
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Info,
  ShieldAlert,
  Scissors,
  HelpCircle,
} from 'lucide-react-native';

export default function DamageInspectionScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language } = useTranslation();

  const [report, setReport] = useState<BlockDamageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'defects' | 'advisor'>('defects');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getBlockDamageReport(blockId as string);
      setReport(data);
    } catch (err) {
      console.warn('Could not fetch damage report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [blockId]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      await analyzeBlockDamage(blockId as string);
      await fetchReport();
      Alert.alert(
        language === 'te' ? 'విశ్లేషణ పూర్తయింది' : 'Analysis Complete',
        language === 'te'
          ? 'రాతి నష్టం మరియు లోపాల పరిశీలన విజయవంతంగా జరిగింది.'
          : 'Stone damage intelligence pipeline executed successfully.'
      );
    } catch (err: any) {
      Alert.alert(
        language === 'te' ? 'విశ్లేషణ లోపం' : 'Analysis Error',
        err?.response?.data?.detail || err?.message || 'Could not analyze stone damage.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const status = report?.analysis_status || 'NOT_RUN';
  const isNotRun = status === 'NOT_RUN';
  const isInProgress = analyzing || status === 'IN_PROGRESS';
  const isFailed = status === 'FAILED';

  const defects = report?.defects || [];
  const cavities = defects.filter((d) => d.defect_type === 'CAVITY');
  const fractures = defects.filter((d) => d.defect_type === 'FRACTURE' || d.defect_type === 'CRACK');
  const chips = defects.filter((d) => d.defect_type === 'CHIP');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title={language === 'te' ? 'లోపాల విశ్లేషణ' : 'Damage Intelligence'}
        subtitle={`Block #${blockId}`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Physical Depth Accuracy Standard Banner */}
        <View
          style={[
            styles.accuracyBanner,
            {
              backgroundColor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ecfeff',
              borderColor: colors.accent || '#06b6d4',
            },
          ]}
        >
          <View style={styles.accuracyHeader}>
            <ShieldEmblemIcon size={18} color={colors.accent || '#06b6d4'} />
            <Text style={[styles.accuracyTitle, { color: colors.accent || '#06b6d4' }]}>
              {language === 'te' ? 'భౌతిక ఖచ్చితత్వ నియమం' : 'Physical Accuracy Standard'}
            </Text>
          </View>
          <Text style={[styles.accuracyText, { color: colors.textSecondary }]}>
            {language === 'te'
              ? 'ఒకే 2D ఫోటో నుండి రంధ్రాల లోతును ఊహించము. బహుళ దృశ్యాల త్రిభుజీకరణ (Multi-View Triangulation) ద్వారా మాత్రమే లోతు లెక్కింపబడుతుంది.'
              : 'Physical depth is strictly marked UNAVAILABLE_SINGLE_VIEW unless multi-view triangulation confirms depth. 2D surface opening dimensions are metric-calibrated via ArUco markers.'}
          </Text>
        </View>

        {/* Action Button: Trigger Analysis */}
        <TouchableOpacity
          style={[
            styles.runAnalysisBtn,
            { backgroundColor: colors.primary, opacity: isInProgress ? 0.7 : 1 },
          ]}
          onPress={handleRunAnalysis}
          disabled={isInProgress}
        >
          {isInProgress ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <RotateCw size={18} color="#000" />
          )}
          <Text style={styles.runAnalysisText}>
            {isInProgress
              ? language === 'te'
                ? 'AI విశ్లేషిస్తోంది...'
                : 'Analyzing Stone Defects...'
              : isNotRun
              ? language === 'te'
                ? 'నష్ట విశ్లేషణ ప్రారంభించండి'
                : 'Run AI Damage Analysis'
              : language === 'te'
              ? 'మళ్లీ విశ్లేషించండి'
              : 'Re-run Damage Analysis'}
          </Text>
        </TouchableOpacity>

        {/* Status Callout if NOT_RUN or FAILED or IN_PROGRESS */}
        {isNotRun && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                borderColor: '#f59e0b',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HelpCircle color="#d97706" size={18} />
              <Text style={[styles.statusBannerTitle, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                {language === 'te' ? 'నష్ట విశ్లేషణ ఇంకా జరగలేదు' : 'Damage Analysis Pending'}
              </Text>
            </View>
            <Text style={[styles.statusBannerBody, { color: isDark ? '#e5e7eb' : '#78350f' }]}>
              {language === 'te'
                ? 'ఈ బ్లాక్‌కు ఇంకా రాతి నష్ట విశ్లేషణ జరగలేదు. ఉపరితల రంధ్రాలు, పగుళ్లు మరియు కట్టింగ్ నష్టాలను గుర్తించడానికి పైన ఉన్న బటన్‌ను నొక్కండి.'
                : "Damage analysis has not been run for this block. Tap 'Run AI Damage Analysis' above to detect surface cavities, cleavage fractures, edge chips, and gangsaw cutting plane risks."}
            </Text>
          </View>
        )}

        {isFailed && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderColor: '#ef4444',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle color="#ef4444" size={18} />
              <Text style={[styles.statusBannerTitle, { color: '#ef4444' }]}>
                {language === 'te' ? 'విశ్లేషణ విఫలమైంది' : 'Damage Analysis Failed'}
              </Text>
            </View>
            <Text style={[styles.statusBannerBody, { color: isDark ? '#e5e7eb' : '#991b1b' }]}>
              {report?.error_message ||
                (language === 'te'
                  ? 'రాతి ఉపరితల విశ్లేషణ పూర్తి కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
                  : 'Defect analysis encountered an error on current photographs. Please retry or upload clear photos.')}
            </Text>
          </View>
        )}

        {isInProgress && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isDark ? 'rgba(6, 182, 212, 0.1)' : '#f0fdf4',
                borderColor: colors.accent || '#06b6d4',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusBannerTitle, { color: colors.text }]}>
                {report?.current_step ||
                  (language === 'te' ? 'ఉపరితల పగుళ్లను విశ్లేషిస్తోంది...' : 'Scanning stone surface for defects...')}
              </Text>
            </View>
          </View>
        )}

        {/* Damage KPI Summary */}
        <View style={[styles.kpiRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {isNotRun ? '—' : report?.total_defects ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'మొత్తం లోపాలు' : 'Total Defects'}
            </Text>
          </View>
          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>
              {isNotRun ? '—' : cavities.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'రంధ్రాలు / గుంటలు' : 'Cavities/Pits'}
            </Text>
          </View>
          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: colors.error || '#ef4444' }]}>
              {isNotRun ? '—' : fractures.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'పగుళ్లు' : 'Fractures'}
            </Text>
          </View>
          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: colors.accent || '#06b6d4' }]}>
              {isNotRun ? '—' : chips.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              {language === 'te' ? 'విరిగిన మూలలు' : 'Chips'}
            </Text>
          </View>
        </View>

        {/* Tabs: Defects List vs Damage Prevention Advisor */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'defects' && [styles.activeTabBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('defects')}
          >
            <FractureIntelligenceIcon size={16} color={activeTab === 'defects' ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'defects' ? colors.primary : colors.textSecondary },
              ]}
            >
              {language === 'te' ? 'లోపాల జాబితా' : 'Defect Registry'} ({isNotRun ? 0 : defects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'advisor' && [styles.activeTabBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('advisor')}
          >
            <CutLabIcon size={16} color={activeTab === 'advisor' ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'advisor' ? colors.primary : colors.textSecondary },
              ]}
            >
              {language === 'te' ? 'కటింగ్ సలహాదారు' : 'Cut Advisor'} ({isNotRun ? 0 : report?.prevention_advisor?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Defects Registry */}
        {activeTab === 'defects' && (
          <View style={styles.tabContent}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : isNotRun ? (
              <View style={styles.emptyContainer}>
                <HelpCircle size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'te' ? 'విశ్లేషణ ఇంకా ప్రారంభం కాలేదు' : 'Analysis Pending'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'రాతి ఉపరితల లోపాలను గుర్తించడానికి పైన ఉన్న "నష్ట విశ్లేషణ ప్రారంభించండి" బటన్‌ను నొక్కండి.'
                    : "Tap 'Run AI Damage Analysis' above to detect stone defects and map gangsaw cut risks."}
                </Text>
              </View>
            ) : defects.length > 0 ? (
              <>
                {defects.map((defect, idx) => (
                  <View
                    key={defect.id || idx}
                    style={[styles.defectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.defectHeader}>
                      <View style={styles.defectTypeBadge}>
                        <FractureIntelligenceIcon size={16} color="#f59e0b" />
                        <Text style={[styles.defectTypeText, { color: colors.text }]}>
                          {defect.defect_type}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              defect.severity === 'CRITICAL' || defect.severity === 'HIGH'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                defect.severity === 'CRITICAL' || defect.severity === 'HIGH'
                                  ? colors.error || '#ef4444'
                                  : '#f59e0b',
                            },
                          ]}
                        >
                          {defect.severity}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.defectDesc, { color: colors.text }]}>
                      {defect.description}
                    </Text>

                    {/* Surface Metric Dimensions */}
                    <View style={[styles.metricsGrid, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Opening Length</Text>
                        <Text style={[styles.metricVal, { color: colors.text }]}>
                          {defect.opening_length_cm != null ? `${defect.opening_length_cm.toFixed(1)} cm` : '—'}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Opening Width</Text>
                        <Text style={[styles.metricVal, { color: colors.text }]}>
                          {defect.opening_width_cm != null ? `${defect.opening_width_cm.toFixed(1)} cm` : '—'}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Surface Area</Text>
                        <Text style={[styles.metricVal, { color: colors.accent || '#06b6d4' }]}>
                          {defect.opening_area_cm2 != null ? `${defect.opening_area_cm2.toFixed(1)} cm²` : '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Depth status & Single View Warning */}
                    <View style={[styles.depthStatusRow, { borderColor: colors.border }]}>
                      <Info size={14} color={colors.textSecondary} />
                      <Text style={[styles.depthStatusText, { color: colors.textSecondary }]}>
                        Depth Status: <Text style={{ color: colors.accent || '#06b6d4', fontWeight: '700' }}>{defect.depth_status}</Text>
                      </Text>
                    </View>
                    {defect.depth_status === 'UNAVAILABLE_SINGLE_VIEW' && (
                      <Text style={[styles.depthWarningNote, { color: '#f59e0b' }]}>
                        ⚠️ {t('singleViewWarning')}
                      </Text>
                    )}

                    {defect.affects_cutting && (
                      <View style={[styles.cuttingWarningPill, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Scissors size={14} color={colors.error || '#ef4444'} />
                        <Text style={[styles.cuttingWarningText, { color: colors.error || '#ef4444' }]}>
                          {language === 'te'
                            ? 'రంపపు కోత దిగుబడిని ప్రభావితం చేస్తుంది (కటింగ్‌లో రాయి విరిగే ప్రమాదం)'
                            : 'Critical: Intersects Gangsaw Cutting Planes'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Visible Surface Metrology Disclaimer Footer */}
                <View style={[styles.surfaceDisclaimerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: colors.border }]}>
                  <Info size={14} color={colors.textSecondary} />
                  <Text style={[styles.surfaceDisclaimerText, { color: colors.textSecondary }]}>
                    {language === 'te'
                      ? 'గమనిక: ఈ పరిశీలన స్కాన్ చేయబడిన కనిపించే ఉపరితలాలకు మాత్రమే వర్తిస్తుంది. లోపలి అంతర్గత పగుళ్లను అల్ట్రాసౌండ్ లేదా కటింగ్ లేకుండా తోసిపుచ్చలేము.'
                      : 'Statutory Metrology Disclaimer: Assessment applies only to processed visible block faces. Internal unseen cleavage planes cannot be excluded without ultrasound or trial sawing.'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={48} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'te' ? 'లోపాలు లేవు' : 'No Structural Defects Detected'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'ఈ గ్రానైట్ బ్లాక్ యొక్క ఉపరితల ఫోటోలలో ఎటువంటి పగుళ్లు లేదా రంధ్రాలు నమోదు కాలేదు.'
                    : 'All scanned visible block faces meet commercial dress specifications without significant cavities or fractures.'}
                </Text>
                <View style={[styles.surfaceDisclaimerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: colors.border, marginTop: spacing.md }]}>
                  <Info size={14} color={colors.textSecondary} />
                  <Text style={[styles.surfaceDisclaimerText, { color: colors.textSecondary }]}>
                    {language === 'te'
                      ? 'గమనిక: ఈ పరిశీలన స్కాన్ చేయబడిన కనిపించే ఉపరితలాలకు మాత్రమే వర్తిస్తుంది. లోపలి అంతర్గత పగుళ్లను అల్ట్రాసౌండ్ లేదా కటింగ్ లేకుండా తోసిపుచ్చలేము.'
                      : 'Statutory Metrology Disclaimer: Assessment applies only to processed visible block faces. Internal unseen cleavage planes cannot be excluded without ultrasound or trial sawing.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tab Content: Damage Prevention Advisor */}
        {activeTab === 'advisor' && (
          <View style={styles.tabContent}>
            {isNotRun ? (
              <View style={styles.emptyContainer}>
                <HelpCircle size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'te' ? 'సలహాలు పెండింగ్‌లో ఉన్నాయి' : 'Cut Advisor Pending'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'నష్ట నివారణ సిఫార్సులు AI నష్ట విశ్లేషణ పూర్తయిన తర్వాత కనిపిస్తాయి.'
                    : 'Gangsaw blade alignment and recovery recommendations will generate after running stone damage analysis.'}
                </Text>
              </View>
            ) : report?.prevention_advisor && report.prevention_advisor.length > 0 ? (
              report.prevention_advisor.map((rule, idx) => (
                <View
                  key={rule.rule_id || idx}
                  style={[styles.advisorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.advisorHeader}>
                    <View style={styles.advisorTitleRow}>
                      <CutLabIcon size={18} color={colors.primary} />
                      <Text style={[styles.advisorRuleId, { color: colors.primary }]}>
                        {rule.rule_id}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor:
                            rule.priority === 'HIGH'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color:
                              rule.priority === 'HIGH'
                                ? colors.error || '#ef4444'
                                : '#f59e0b',
                          },
                        ]}
                      >
                        {rule.priority} PRIORITY
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.advisorTitle, { color: colors.text }]}>
                    {language === 'te' && rule.title_te ? rule.title_te : rule.title}
                  </Text>

                  <View style={[styles.actionSection, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.actionLabel, { color: colors.primary }]}>
                      {language === 'te' ? 'సిఫార్సు చేయబడిన చర్య:' : 'Recommended Saw Action:'}
                    </Text>
                    <Text style={[styles.actionText, { color: colors.text }]}>
                      {rule.action}
                    </Text>
                  </View>

                  <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
                    <Text style={{ fontWeight: '700' }}>Reason: </Text>
                    {rule.reason}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={48} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'te' ? 'ఆదర్శవంతమైన కట్టింగ్' : 'Standard Gangsaw Processing'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {language === 'te'
                    ? 'ఎటువంటి లోపాలు లేవు కాబట్టి ప్రామాణిక కట్టింగ్ మార్గదర్శకాలను పాటించవచ్చు.'
                    : 'No special damage mitigation required. Standard gangsaw blade kerf (4mm) and orientation can proceed.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  accuracyBanner: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  accuracyTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
    textTransform: 'uppercase',
  },
  accuracyText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.fonts.regular,
  },
  runAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  runAnalysisText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  statusBanner: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBannerBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiBox: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  kpiLabel: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fonts.medium,
  },
  kpiDivider: {
    width: 1,
    height: 24,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabBtn: {
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  tabContent: {
    gap: 12,
  },
  defectCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  defectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  defectTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defectTypeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  defectDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    fontFamily: typography.fonts.regular,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: typography.fonts.regular,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: typography.fonts.semiBold,
  },
  depthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  depthStatusText: {
    fontSize: 11,
    fontFamily: typography.fonts.regular,
  },
  depthWarningNote: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: typography.fonts.medium,
  },
  cuttingWarningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  cuttingWarningText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  surfaceDisclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  surfaceDisclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontFamily: typography.fonts.regular,
  },
  advisorCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  advisorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  advisorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advisorRuleId: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  advisorTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: typography.fonts.semiBold,
  },
  actionSection: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: typography.fonts.semiBold,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.fonts.regular,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.fonts.regular,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    fontFamily: typography.fonts.semiBold,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    fontFamily: typography.fonts.regular,
  },
});
