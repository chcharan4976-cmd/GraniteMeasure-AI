import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { useTranslation } from '../../src/i18n/useTranslation';
import {
  getBlock,
  getBlockWorkspace,
  archiveBlock,
  restoreBlock,
  deleteBlock,
  triggerAnalysis,
  generateDressingPlan,
  recordTapeReference,
} from '../../src/api/blocks';
import { getBlockDamageReport, BlockDamageReport } from '../../src/api/damage';
import {
  GraniteBlockIcon,
  FractureIntelligenceIcon,
  MetricRulerIcon,
  ShieldEmblemIcon,
  CutLabIcon,
  GeoTwinIcon,
} from '../../src/components/DomainIcons';
import {
  MapPin,
  Camera,
  CheckCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Ruler,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Box,
  Layers,
  Sparkles,
  Info,
  Archive,
  Trash2,
  Cpu,
  RefreshCw,
  Scissors,
  Percent,
  ShieldAlert,
  ArrowLeft,
  X,
  Play,
  RotateCcw,
  Check,
  Eye,
  Sliders,
  Scale,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ActiveTab = 'EVIDENCE' | 'MEASUREMENTS' | 'DEFECTS' | 'DRESSING' | 'COMPARISON';
type DressingObjective = 'MAXIMIZE_RECTANGULAR_YIELD' | 'MINIMIZE_MATERIAL_REMOVAL' | 'DEFECT_AVOIDANCE';

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language } = useTranslation();

  const [workspace, setWorkspace] = useState<any | null>(null);
  const [damageReport, setDamageReport] = useState<BlockDamageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('MEASUREMENTS');

  // Dressing Studio state
  const [dressingObjective, setDressingObjective] = useState<DressingObjective>('MAXIMIZE_RECTANGULAR_YIELD');
  const [simulationStep, setSimulationStep] = useState(0); // 0 to 4
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Gallery modal
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Accordion toggle for "How the AI Measured This Block"
  const [showExplanation, setShowExplanation] = useState(false);

  // Physical reference calibration modal
  const [showRefModal, setShowRefModal] = useState(false);
  const [tapeLength, setTapeLength] = useState('');
  const [tapeBreadth, setTapeBreadth] = useState('');
  const [tapeHeight, setTapeHeight] = useState('');
  const [tapeWeight, setTapeWeight] = useState('');
  const [submittingRef, setSubmittingRef] = useState(false);

  // Action states
  const [isTriggeringAI, setIsTriggeringAI] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Archived by field officer');
  const [isArchiving, setIsArchiving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBlockData();
  }, [id]);

  const fetchBlockData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      try {
        const wsData = await getBlockWorkspace(id as string);
        setWorkspace(wsData);
        if (wsData?.cutting_plan?.dressing_objective) {
          setDressingObjective(wsData.cutting_plan.dressing_objective);
        }
      } catch (wsErr: any) {
        console.warn('Workspace fetch note, attempting block fallback:', wsErr);
        try {
          const fallback = await getBlock(id as string);
          setWorkspace({ block: fallback, identifier: fallback.identifier, id: fallback.id });
        } catch {
          throw wsErr;
        }
      }

      try {
        const dmg = await getBlockDamageReport(id as string);
        setDamageReport(dmg);
      } catch {
        // Damage report optional
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setLoadError('Granite block record not found on server.');
      } else if (!err.response) {
        setLoadError('Could not reach backend. Check network connectivity.');
      } else {
        setLoadError(`Server error (${status}). Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAI = async (stage: string = 'RAW') => {
    try {
      setIsTriggeringAI(true);
      await triggerAnalysis(workspace?.id || (id as string), stage);
      Alert.alert(
        language === 'te' ? 'AI విశ్లేషణ ప్రారంభించబడింది' : 'AI Analysis Started',
        language === 'te'
          ? '3D పునర్నిర్మాణం మరియు కొలత ప్రాసెసింగ్ ప్రారంభమైంది.'
          : '3D spatial reconstruction and volumetric calculations are underway.',
        [{ text: 'OK', onPress: () => fetchBlockData() }]
      );
    } catch (err: any) {
      Alert.alert(
        language === 'te' ? 'విశ్లేషణ లోపం' : 'Analysis Error',
        err?.response?.data?.detail || err.message || 'Could not start analysis.'
      );
    } finally {
      setIsTriggeringAI(false);
    }
  };

  const handleGenerateDressingPlan = async (objective: DressingObjective) => {
    try {
      setIsGeneratingPlan(true);
      setDressingObjective(objective);
      const res = await generateDressingPlan(workspace?.id || (id as string), objective, 3.0);
      Alert.alert(
        language === 'te' ? 'డ్రెస్సింగ్ ప్రణాళిక సిద్ధమైంది' : 'Dressing Plan Optimized',
        language === 'te'
          ? `లక్ష్యం: ${objective}. రికవరీ రేటు: ${res.recovery_percentage}%.`
          : `Objective: ${objective}. Usable Recovery: ${res.recovery_percentage}%. 4 precision cuts planned.`
      );
      await fetchBlockData();
    } catch (err: any) {
      Alert.alert(
        language === 'te' ? 'డ్రెస్సింగ్ లోపం' : 'Dressing Plan Error',
        err?.response?.data?.detail || err.message || 'Could not generate dressing plan.'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveTapeReference = async () => {
    if (!tapeLength || !tapeBreadth || !tapeHeight) {
      Alert.alert('Required', 'Please enter Length, Breadth, and Height in cm.');
      return;
    }
    setSubmittingRef(true);
    try {
      await recordTapeReference(id as string, {
        tape_length_cm: parseFloat(tapeLength),
        tape_breadth_cm: parseFloat(tapeBreadth),
        tape_height_cm: parseFloat(tapeHeight),
        weight_mt: tapeWeight ? parseFloat(tapeWeight) : undefined,
        recorded_by: 'Mining Field Officer',
      });
      setShowRefModal(false);
      Alert.alert(
        language === 'te' ? 'ధృవీకరించబడింది' : 'Calibrated',
        language === 'te' ? 'మాన్యువల్ టేప్ కొలతలు భద్రపరచబడ్డాయి.' : 'Physical manual reference recorded for ground-truth audit.'
      );
      await fetchBlockData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not save tape reference.');
    } finally {
      setSubmittingRef(false);
    }
  };

  const handleArchiveBlock = async () => {
    try {
      setIsArchiving(true);
      await archiveBlock(workspace?.id || (id as string), archiveReason);
      setShowArchiveModal(false);
      Alert.alert('Archived', `Block ${workspace?.identifier} soft-archived successfully.`);
      await fetchBlockData();
    } catch (err: any) {
      Alert.alert('Archive Error', err?.response?.data?.detail || err.message || 'Could not archive block.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreBlock = async () => {
    try {
      setLoading(true);
      await restoreBlock(workspace?.id || (id as string));
      Alert.alert('Restored', `Block ${workspace?.identifier} restored to active registry.`);
      await fetchBlockData();
    } catch (err: any) {
      Alert.alert('Restore Error', err?.response?.data?.detail || err.message || 'Could not restore block.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async () => {
    try {
      setIsDeleting(true);
      await deleteBlock(workspace?.id || (id as string), undefined, 'Deleted by field officer');
      setShowDeleteModal(false);
      Alert.alert(
        language === 'te' ? 'బ్లాక్ తొలగించబడింది' : 'Block Deleted',
        language === 'te'
          ? `బ్లాక్ ${workspace?.identifier} విజయవంతంగా తొలగించబడింది.`
          : `Block ${workspace?.identifier} has been deleted from the registry.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/blocks') }]
      );
    } catch (err: any) {
      Alert.alert(
        'Deletion Error',
        err?.response?.data?.detail?.message || err?.response?.data?.detail || err.message || 'Could not delete block.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading Granite Intelligence...
        </Text>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t('blockDetails')} />
        <View style={styles.errorBox}>
          <AlertCircle size={40} color={colors.error || '#ef4444'} />
          <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.sm }]}>
            {loadError || 'Block Not Found'}
          </Text>
          <Button title="Go Back" variant="outline" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const blockData = workspace.block || workspace;
  const stages = workspace.stages || {};
  const rawStage = stages.raw || {};
  const proposedStage = stages.proposed || {};
  const actualStage = stages.actual_dressed || {};
  const manualTape = stages.manual_tape || workspace.physical_reference;
  const comparison = workspace.comparison || {};
  const quickSummary = workspace.quick_summary || [];
  const primaryAction = workspace.primary_action;
  const heroImage = workspace.hero_image;
  const advisories = workspace.advisories || workspace.advisory || [];
  const defects = workspace.defects?.defect_list || workspace.defect_list || [];
  const cuttingPlan = workspace.cutting_plan || proposedStage.cutting_plan;
  const allImages = (workspace.images && workspace.images.length > 0)
    ? workspace.images
    : (heroImage?.all_images || []);
  const displayHeroUri = heroImage?.watermarked_url || heroImage?.file_url || (allImages.length > 0 ? (allImages[0].watermarked_url || allImages[0].file_url || allImages[0].url) : null);

  const rawMeas = rawStage.measurement || workspace.raw_measurement || workspace.measurement;
  const postMeas = actualStage.measurement || workspace.post_measurement;

  // Execute primary action CTA
  const handleExecutePrimaryAction = () => {
    if (!primaryAction) return;
    switch (primaryAction.action) {
      case 'ADD_PHOTOS':
        router.push(`/capture/${blockData.identifier || blockData.id}`);
        break;
      case 'ANALYZE_GRANITE':
        handleTriggerAI('RAW');
        break;
      case 'ADD_REFERENCE':
        setShowRefModal(true);
        break;
      case 'PLAN_DRESSING':
        handleGenerateDressingPlan(dressingObjective);
        break;
      case 'CAPTURE_AFTER_DRESSING':
        router.push(`/capture/${blockData.identifier || blockData.id}?stage=POST_DRESSING`);
        break;
      case 'ANALYZE_POST_DRESSING':
        handleTriggerAI('POST_DRESSING');
        break;
      case 'COMPARE_RESULTS':
        setActiveTab('COMPARISON');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. OPERATIONAL TOP BAR */}
      <View style={[styles.operationalBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GraniteBlockIcon size={18} color={colors.primary} />
            <Text style={[styles.blockIdTitle, { color: colors.text }]} numberOfLines={1}>
              {blockData.identifier}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {workspace.quarry?.name || 'Chimakurthy Galaxy Pit'} • {workspace.quarry?.district || 'Prakasam'}
          </Text>
        </View>
        <StatusBadge status={blockData.status} />
        <TouchableOpacity onPress={fetchBlockData} style={[styles.iconCircle, { marginLeft: spacing.xs }]}>
          <RefreshCw size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. HERO IMAGE WITH OFFICIAL EVIDENCE OVERLAY */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            if (allImages.length > 0) setGalleryModalVisible(true);
          }}
          style={styles.heroWrapper}
        >
          {displayHeroUri ? (
            <Image
              source={{ uri: displayHeroUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#1e2532' : '#f1f5f9' }]}>
              <Camera size={44} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                No Evidence Photos Captured Yet
              </Text>
            </View>
          )}

          {/* Official floating badge */}
          <View style={styles.heroTopBadge}>
            <ShieldEmblemIcon size={14} color="#10B981" />
            <Text style={styles.heroTopBadgeText}>OFFICIAL QUARRY EVIDENCE • 6-VIEW SCAN</Text>
          </View>

          {/* Bottom evidence stamp */}
          <View style={styles.heroBottomStamp}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stampIdText}>{blockData.identifier}</Text>
              <Text style={styles.stampSubText}>
                {heroImage?.gps_latitude && heroImage?.gps_longitude
                  ? `GPS: ${Number(heroImage.gps_latitude).toFixed(4)}°N, ${Number(heroImage.gps_longitude).toFixed(4)}°E (±${heroImage.gps_accuracy_m || 3.2}m)`
                  : 'GPS: Prakasam Concession Datum'}
              </Text>
            </View>
            <View style={styles.galleryBadge}>
              <Eye size={12} color="#FFF" />
              <Text style={styles.galleryBadgeText}>{allImages.length} Photos</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. QUICK ENGINEERING SUMMARY (6 METRIC TILES) */}
        <View style={styles.tilesContainer}>
          {quickSummary.map((tile: any, idx: number) => (
            <View
              key={tile.key || idx}
              style={[
                styles.tileCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]} numberOfLines={1}>
                {language === 'te' ? tile.label_te || tile.label : tile.label}
              </Text>
              <Text style={[styles.tileValue, { color: colors.text }]} numberOfLines={1}>
                {tile.value}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 9 }]} numberOfLines={1}>
                {tile.subtext}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. DYNAMIC SINGLE PRIMARY ACTION CTA BUTTON */}
        {primaryAction && (
          <TouchableOpacity
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor:
                  primaryAction.button_type === 'success'
                    ? '#059669'
                    : primaryAction.button_type === 'accent'
                    ? '#0891b2'
                    : primaryAction.button_type === 'secondary'
                    ? '#3b82f6'
                    : colors.primary,
              },
            ]}
            onPress={handleExecutePrimaryAction}
            activeOpacity={0.88}
          >
            <View style={styles.primaryActionIconBox}>
              {primaryAction.action === 'ADD_PHOTOS' || primaryAction.action === 'CAPTURE_AFTER_DRESSING' ? (
                <Camera size={20} color="#FFF" />
              ) : primaryAction.action === 'ANALYZE_GRANITE' || primaryAction.action === 'ANALYZE_POST_DRESSING' ? (
                <Cpu size={20} color="#FFF" />
              ) : primaryAction.action === 'PLAN_DRESSING' ? (
                <Scissors size={20} color="#FFF" />
              ) : primaryAction.action === 'ADD_REFERENCE' ? (
                <Ruler size={20} color="#FFF" />
              ) : (
                <CheckCircle2 size={20} color="#FFF" />
              )}
            </View>
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Text style={styles.primaryActionTitle}>
                {language === 'te' ? primaryAction.label_te : primaryAction.label}
              </Text>
              <Text style={styles.primaryActionDesc} numberOfLines={1}>
                {primaryAction.description}
              </Text>
            </View>
            <ChevronRight size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* 5. TOP ENGINEERING ADVISORY BANNER (IF PRESENT) */}
        {advisories.length > 0 && (
          <View
            style={[
              styles.advisoryBanner,
              {
                backgroundColor:
                  advisories[0].priority === 'HIGH'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(245, 158, 11, 0.08)',
                borderColor: advisories[0].priority === 'HIGH' ? '#ef4444' : '#f59e0b',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} color={advisories[0].priority === 'HIGH' ? '#ef4444' : '#f59e0b'} />
              <Text
                style={[
                  styles.advisoryTitle,
                  { color: advisories[0].priority === 'HIGH' ? '#dc2626' : '#d97706' },
                ]}
              >
                {language === 'te' ? advisories[0].title_te : advisories[0].title_en}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.text, marginTop: 4 }]}>
              {language === 'te' ? advisories[0].description_te : advisories[0].description_en}
            </Text>
            {advisories[0].action_type === 'PLAN_DRESSING' && (
              <TouchableOpacity
                style={[styles.advisoryCtaBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => setActiveTab('DRESSING')}
              >
                <Text style={styles.advisoryCtaText}>
                  {language === 'te' ? advisories[0].action_label_te : advisories[0].action_label_en}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 6. TABBED NAVIGATION BAR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {[
            { id: 'MEASUREMENTS', label: t('measurementsTab') || 'Measurements' },
            { id: 'DRESSING', label: t('dressingTab') || 'Dressing Studio' },
            { id: 'COMPARISON', label: t('comparisonTab') || 'Audit & Balance' },
            { id: 'DEFECTS', label: t('damageTab') || 'Damage & Cavities' },
            { id: 'EVIDENCE', label: t('evidenceTab') || 'Evidence & Views' },
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as ActiveTab)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSel ? colors.primary : colors.surface,
                    borderColor: isSel ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSel ? '#FFF' : colors.textSecondary,
                      fontWeight: isSel ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =========================================================================
            SECTION: MEASUREMENTS & VOLUME DIAGNOSTICS
           ========================================================================= */}
        {activeTab === 'MEASUREMENTS' && (
          <View style={styles.tabContent}>
            {/* Dimensions Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MetricRulerIcon size={18} color={colors.primary} />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>Metric Dimensions & Envelopes</Text>
                </View>
                <View
                  style={[
                    styles.calibPill,
                    {
                      backgroundColor:
                        rawMeas?.calibration_status === 'CALIBRATED'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: rawMeas?.calibration_status === 'CALIBRATED' ? '#059669' : '#d97706',
                      fontWeight: '700',
                      fontSize: 10,
                    }}
                  >
                    {rawMeas?.calibration_status === 'CALIBRATED' ? '±1.5% CALIBRATED' : '±8.5% ESTIMATED'}
                  </Text>
                </View>
              </View>

              {rawMeas?.length_cm ? (
                <>
                  <View style={styles.dimBoxesRow}>
                    <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Length (L)</Text>
                      <Text style={[styles.dimBoxNumber, { color: colors.text }]}>
                        {Number(rawMeas.length_cm).toFixed(1)} cm
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        {(Number(rawMeas.length_cm) / 100).toFixed(2)} m
                      </Text>
                    </View>
                    <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Breadth (B)</Text>
                      <Text style={[styles.dimBoxNumber, { color: colors.text }]}>
                        {Number(rawMeas.breadth_cm).toFixed(1)} cm
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        {(Number(rawMeas.breadth_cm) / 100).toFixed(2)} m
                      </Text>
                    </View>
                    <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Height (H)</Text>
                      <Text style={[styles.dimBoxNumber, { color: colors.text }]}>
                        {Number(rawMeas.height_cm).toFixed(1)} cm
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        {(Number(rawMeas.height_cm) / 100).toFixed(2)} m
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />

                  {/* Volume diagnostics */}
                  <View style={styles.volDiagRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Irregular Stone Volume</Text>
                      <Text style={[styles.volDiagNumber, { color: colors.primary }]}>
                        {rawMeas.irregular_volume_m3 ? `${Number(rawMeas.irregular_volume_m3).toFixed(3)} m³` : '—'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        Physical 3D reconstructed rock volume
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>BBox Envelope</Text>
                      <Text style={[styles.volDiagNumber, { color: colors.text }]}>
                        {rawMeas.bbox_volume_m3 || rawMeas.volume_m3 ? `${Number(rawMeas.bbox_volume_m3 || rawMeas.volume_m3).toFixed(3)} m³` : '—'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        Cleavage-aligned rectangular envelope
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.volDiagRow, { marginTop: spacing.sm }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Estimated Tonnage</Text>
                      <Text style={[styles.volDiagNumber, { color: colors.text }]}>
                        {rawMeas.weight_mt ? `${Number(rawMeas.weight_mt).toFixed(2)} MT` : '—'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        Density 2.70 t/m³ (Chimakurthy Galaxy)
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Seigniorage Fee</Text>
                      <Text style={[styles.volDiagNumber, { color: '#059669' }]}>
                        {workspace.seigniorage?.total_payable_inr ? `₹${Number(workspace.seigniorage.total_payable_inr).toLocaleString()}` : '—'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                        Royalty + DMF (30%) + MERIT (2%)
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                  <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Photogrammetric dimensions pending. Capture 6 views and run AI analysis.
                  </Text>
                </View>
              )}
            </Card>

            {/* Manual Tape Ground-Truth Audit Card */}
            {manualTape && (
              <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ruler size={18} color="#0891b2" />
                    <Text style={[typography.cardTitle, { color: colors.text }]}>Manual Tape Audit Ground-Truth</Text>
                  </View>
                  <View style={[styles.calibPill, { backgroundColor: 'rgba(8, 145, 178, 0.12)' }]}>
                    <CheckCircle2 size={12} color="#0891b2" />
                    <Text style={{ color: '#0891b2', fontWeight: '700', fontSize: 10 }}>VERIFIED</Text>
                  </View>
                </View>
                <View style={[styles.tapeTable, { backgroundColor: colors.surfaceElevated, marginTop: spacing.sm }]}>
                  <View style={styles.tapeTableRow}>
                    <Text style={[styles.tapeTableHead, { color: colors.textSecondary }]}>Axis</Text>
                    <Text style={[styles.tapeTableHead, { color: colors.text }]}>Tape (cm)</Text>
                    <Text style={[styles.tapeTableHead, { color: colors.primary }]}>AI Photogrammetry</Text>
                    <Text style={[styles.tapeTableHead, { color: colors.textSecondary }]}>Variance</Text>
                  </View>
                  <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                  {[
                    { axis: 'Length', tape: manualTape.tape_length_cm, ai: rawMeas?.length_cm },
                    { axis: 'Breadth', tape: manualTape.tape_breadth_cm, ai: rawMeas?.breadth_cm },
                    { axis: 'Height', tape: manualTape.tape_height_cm, ai: rawMeas?.height_cm },
                  ].map((row) => {
                    const diff = row.tape && row.ai ? ((row.ai - row.tape) / row.tape) * 100 : null;
                    return (
                      <View key={row.axis} style={styles.tapeTableRow}>
                        <Text style={[styles.tapeTableCell, { color: colors.text, fontWeight: '600' }]}>{row.axis}</Text>
                        <Text style={[styles.tapeTableCell, { color: colors.text }]}>{row.tape?.toFixed(1) || '—'}</Text>
                        <Text style={[styles.tapeTableCell, { color: colors.primary }]}>{row.ai?.toFixed(1) || '—'}</Text>
                        <Text
                          style={[
                            styles.tapeTableCell,
                            { color: diff != null && Math.abs(diff) <= 2.0 ? '#059669' : '#d97706', fontWeight: '700' },
                          ]}
                        >
                          {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Transparent Photogrammetry Explanation Accordion */}
            <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={styles.cardHeaderRow}
                onPress={() => setShowExplanation(!showExplanation)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={18} color={colors.primary} />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>How AI Reconstructed This Block</Text>
                </View>
                {showExplanation ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
              </TouchableOpacity>
              {showExplanation && (
                <View style={{ marginTop: spacing.sm, gap: 8 }}>
                  {[
                    { step: '01', title: '6-View Orbital Photogrammetry', desc: 'Overlapping photographs capture block boundary edges and surface profile.' },
                    { step: '02', title: 'Scale Marker Calibration', desc: 'ArUco optical marker establishes physical millimetre-to-pixel scale reference.' },
                    { step: '03', title: 'ORB Feature Matching & RANSAC', desc: 'Epipolar ray triangulation isolates stone geometry from quarry ground.' },
                    { step: '04', title: 'Principal Component BBox Fitting', desc: 'Minimum oriented bounding box fitted along true natural stone cleavage planes.' },
                  ].map((s) => (
                    <View key={s.step} style={[styles.stepRow, { borderColor: colors.borderSubtle }]}>
                      <Text style={[styles.stepNumText, { color: colors.primary }]}>{s.step}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitleText, { color: colors.text }]}>{s.title}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{s.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* =========================================================================
            SECTION: DRESSING STUDIO (INTERACTIVE DESIGN & SIMULATION)
           ========================================================================= */}
        {activeTab === 'DRESSING' && (
          <View style={styles.tabContent}>
            {/* Simulation Notice */}
            <View style={styles.simulationNoticePlate}>
              <Scissors size={16} color="#0891b2" />
              <Text style={styles.simulationNoticeText}>
                {language === 'te'
                  ? 'ప్రతిపాదిత డ్రెస్సింగ్ ప్రణాళిక — ఇంకా వాస్తవంగా ధృవీకరించబడలేదు'
                  : 'PROPOSED DRESSING PLAN — NOT YET PHYSICALLY VERIFIED'}
              </Text>
            </View>

            {/* Objective Selector */}
            <Card style={styles.sectionCard}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>Select Dressing Objective</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Tailor wire-saw passes for rectangular yield, stone retention, or flaw avoidance.
              </Text>
              <View style={styles.objectivePillsRow}>
                {[
                  { id: 'MAXIMIZE_RECTANGULAR_YIELD', label: 'Max Yield', sub: 'Standard Cuboid' },
                  { id: 'MINIMIZE_MATERIAL_REMOVAL', label: 'Min Trim', sub: 'Stone Retention' },
                  { id: 'DEFECT_AVOIDANCE', label: 'Flaw Clear', sub: 'Cut Past Cracks' },
                ].map((obj) => {
                  const isSel = dressingObjective === obj.id;
                  return (
                    <TouchableOpacity
                      key={obj.id}
                      onPress={() => handleGenerateDressingPlan(obj.id as DressingObjective)}
                      style={[
                        styles.objPillItem,
                        {
                          backgroundColor: isSel ? 'rgba(5, 150, 105, 0.12)' : colors.surfaceElevated,
                          borderColor: isSel ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.objPillLabel, { color: isSel ? colors.primary : colors.text }]}>
                        {obj.label}
                      </Text>
                      <Text style={[styles.objPillSub, { color: colors.textSecondary }]}>{obj.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Dressing Plan Metrics */}
            {cuttingPlan && (
              <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>{cuttingPlan.plan_name}</Text>
                  <View style={[styles.calibPill, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 11 }}>
                      {cuttingPlan.recovery_percentage}% RECOVERY
                    </Text>
                  </View>
                </View>

                {/* Target Dimensions */}
                <View style={[styles.dimBoxesRow, { marginTop: spacing.sm }]}>
                  <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Target Length</Text>
                    <Text style={[styles.dimBoxNumber, { color: colors.primary }]}>
                      {cuttingPlan.target_length_cm?.toFixed(1) || '—'} cm
                    </Text>
                  </View>
                  <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Target Breadth</Text>
                    <Text style={[styles.dimBoxNumber, { color: colors.primary }]}>
                      {cuttingPlan.target_breadth_cm?.toFixed(1) || '—'} cm
                    </Text>
                  </View>
                  <View style={[styles.dimBoxItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Target Height</Text>
                    <Text style={[styles.dimBoxNumber, { color: colors.primary }]}>
                      {cuttingPlan.target_height_cm?.toFixed(1) || '—'} cm
                    </Text>
                  </View>
                </View>

                {/* Volume & Wastage Breakdown */}
                <View style={[styles.volDiagRow, { marginTop: spacing.md }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Dressed Usable Vol</Text>
                    <Text style={[styles.volDiagNumber, { color: colors.primary }]}>
                      {cuttingPlan.dressed_volume_m3?.toFixed(3) || '—'} m³
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Material Removed</Text>
                    <Text style={[styles.volDiagNumber, { color: '#ef4444' }]}>
                      {cuttingPlan.removed_volume_m3?.toFixed(3) || '—'} m³
                    </Text>
                  </View>
                </View>

                {/* Visual Material Loss Bar */}
                <View style={styles.recoveryBarWrapper}>
                  <View
                    style={[
                      styles.recoveryBarFill,
                      {
                        width: `${Math.min(100, cuttingPlan.recovery_percentage || 85)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.recoveryBarFill,
                      {
                        width: `${Math.min(100, 100 - (cuttingPlan.recovery_percentage || 85))}%`,
                        backgroundColor: '#f59e0b',
                      },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                    Usable: {cuttingPlan.recovery_percentage}%
                  </Text>
                  <Text style={[typography.caption, { color: '#d97706', fontWeight: '700' }]}>
                    Wastage Loss: {cuttingPlan.wastage_percentage}%
                  </Text>
                </View>
              </Card>
            )}

            {/* Interactive 4-Cut Sequence */}
            {cuttingPlan?.operations && cuttingPlan.operations.length > 0 && (
              <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>Wire-Saw Cutting Sequence</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {cuttingPlan.operations.length} Planned Passes
                  </Text>
                </View>

                {/* Step stepper buttons */}
                <View style={styles.stepperControlRow}>
                  {[0, 1, 2, 3, 4].map((stepIdx) => (
                    <TouchableOpacity
                      key={stepIdx}
                      onPress={() => setSimulationStep(stepIdx)}
                      style={[
                        styles.stepperPill,
                        {
                          backgroundColor: simulationStep === stepIdx ? colors.primary : colors.surfaceElevated,
                          borderColor: simulationStep === stepIdx ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: simulationStep === stepIdx ? '#FFF' : colors.textSecondary,
                        }}
                      >
                        {stepIdx === 0 ? 'Raw' : `Cut ${stepIdx}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Operations List */}
                <View style={{ marginTop: spacing.sm, gap: 10 }}>
                  {cuttingPlan.operations.map((op: any, index: number) => {
                    const isActive = simulationStep >= op.order;
                    return (
                      <View
                        key={op.id || index}
                        style={[
                          styles.cutOpCard,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: isActive ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                      >
                        <View style={styles.cutOpHeader}>
                          <View style={[styles.cutOrderBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.cutOrderText}>#{op.order}</Text>
                          </View>
                          <Text style={[styles.cutOpTitle, { color: colors.text }]} numberOfLines={1}>
                            {op.cut_type}
                          </Text>
                          <Text style={[typography.caption, { color: '#ef4444', fontWeight: '700' }]}>
                            -{op.material_removed_m3 ? Number(op.material_removed_m3).toFixed(3) : '0'} m³
                          </Text>
                        </View>
                        <Text style={[typography.caption, { color: colors.text, marginTop: 4 }]}>
                          {op.description}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 2 }]}>
                          Rationale: {op.reason}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Post-Dressing Next Step Button */}
            <TouchableOpacity
              style={[styles.captureDressedBtn, { backgroundColor: '#0891b2' }]}
              onPress={() => router.push(`/capture/${blockData.identifier || blockData.id}?stage=POST_DRESSING`)}
            >
              <Camera size={18} color="#FFF" />
              <Text style={styles.captureDressedBtnText}>
                {language === 'te' ? 'డ్రెస్సింగ్ తదుపరి ఫోటోలు తీయండి' : 'Capture Stone After Physical Dressing'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =========================================================================
            SECTION: FINAL AUDIT & CLOSED MATERIAL BALANCE (RAW vs PROPOSED vs ACTUAL)
           ========================================================================= */}
        {activeTab === 'COMPARISON' && (
          <View style={styles.tabContent}>
            {/* 3-Column Reconciliation Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Scale size={18} color={colors.primary} />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>3-Way Stage Reconciliation</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {actualStage.has_evidence ? 'Verified Physical' : 'Simulation'}
                </Text>
              </View>

              {/* 3-Column Table */}
              <View style={[styles.reconcileTable, { backgroundColor: colors.surfaceElevated, marginTop: spacing.sm }]}>
                <View style={styles.reconcileRow}>
                  <Text style={[styles.reconcileHead, { color: colors.textSecondary, flex: 1.2 }]}>Metric</Text>
                  <Text style={[styles.reconcileHead, { color: colors.text }]}>1. Raw</Text>
                  <Text style={[styles.reconcileHead, { color: '#0891b2' }]}>2. Plan</Text>
                  <Text style={[styles.reconcileHead, { color: colors.primary }]}>3. Dressed</Text>
                </View>
                <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                {[
                  {
                    name: 'Length (cm)',
                    raw: rawMeas?.length_cm?.toFixed(1) || '—',
                    plan: cuttingPlan?.target_length_cm?.toFixed(1) || '—',
                    act: postMeas?.length_cm?.toFixed(1) || '—',
                  },
                  {
                    name: 'Breadth (cm)',
                    raw: rawMeas?.breadth_cm?.toFixed(1) || '—',
                    plan: cuttingPlan?.target_breadth_cm?.toFixed(1) || '—',
                    act: postMeas?.breadth_cm?.toFixed(1) || '—',
                  },
                  {
                    name: 'Height (cm)',
                    raw: rawMeas?.height_cm?.toFixed(1) || '—',
                    plan: cuttingPlan?.target_height_cm?.toFixed(1) || '—',
                    act: postMeas?.height_cm?.toFixed(1) || '—',
                  },
                  {
                    name: 'Volume (m³)',
                    raw: rawStage.irregular_volume_m3 ? Number(rawStage.irregular_volume_m3).toFixed(3) : '—',
                    plan: cuttingPlan?.dressed_volume_m3 ? Number(cuttingPlan.dressed_volume_m3).toFixed(3) : '—',
                    act: postMeas?.volume_m3 ? Number(postMeas.volume_m3).toFixed(3) : '—',
                  },
                  {
                    name: 'Recovery %',
                    raw: '100%',
                    plan: cuttingPlan?.recovery_percentage ? `${cuttingPlan.recovery_percentage}%` : '—',
                    act: comparison.metrics_comparison?.actual?.actual_recovery_pct ? `${comparison.metrics_comparison.actual.actual_recovery_pct}%` : 'Pending',
                  },
                ].map((r) => (
                  <View key={r.name} style={styles.reconcileRow}>
                    <Text style={[styles.reconcileCell, { color: colors.text, fontWeight: '600', flex: 1.2 }]}>
                      {r.name}
                    </Text>
                    <Text style={[styles.reconcileCell, { color: colors.text }]}>{r.raw}</Text>
                    <Text style={[styles.reconcileCell, { color: '#0891b2' }]}>{r.plan}</Text>
                    <Text style={[styles.reconcileCell, { color: colors.primary, fontWeight: '700' }]}>{r.act}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Closed Material Balance Card */}
            {comparison.material_balance && (
              <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Percent size={18} color="#059669" />
                    <Text style={[typography.cardTitle, { color: colors.text }]}>Closed Material Balance Equation</Text>
                  </View>
                  <View style={[styles.calibPill, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 10 }}>BALANCED</Text>
                  </View>
                </View>

                <View style={[styles.equationBox, { backgroundColor: colors.surfaceElevated, marginTop: spacing.sm }]}>
                  <Text style={[styles.equationText, { color: colors.text }]}>
                    {comparison.material_balance.equation_text}
                  </Text>
                </View>

                <View style={[styles.balancePillGrid, { marginTop: spacing.md }]}>
                  <View style={[styles.balancePillItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Raw Irregular</Text>
                    <Text style={[styles.balancePillVal, { color: colors.text }]}>
                      {comparison.material_balance.raw_irregular_volume_m3} m³
                    </Text>
                  </View>
                  <View style={[styles.balancePillItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Usable Dressed</Text>
                    <Text style={[styles.balancePillVal, { color: colors.primary }]}>
                      {comparison.material_balance.usable_dressed_volume_m3} m³
                    </Text>
                  </View>
                  <View style={[styles.balancePillItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Cavity Loss</Text>
                    <Text style={[styles.balancePillVal, { color: '#f59e0b' }]}>
                      {comparison.material_balance.defect_cavity_loss_m3} m³
                    </Text>
                  </View>
                  <View style={[styles.balancePillItem, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Saw Kerf + Trim</Text>
                    <Text style={[styles.balancePillVal, { color: '#ef4444' }]}>
                      {(Number(comparison.material_balance.saw_kerf_loss_m3 || 0) + Number(comparison.material_balance.dressing_trim_loss_m3 || 0)).toFixed(3)} m³
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Side-by-Side Before vs After Photos */}
            {comparison.side_by_side && (comparison.side_by_side.raw_photo_url || comparison.side_by_side.post_photo_url) && (
              <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
                <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
                  Before vs After Dressing Comparison
                </Text>
                <View style={styles.sideBySideRow}>
                  <View style={styles.sideBySideCol}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
                      Stage 1: Raw Stone
                    </Text>
                    {comparison.side_by_side.raw_photo_url ? (
                      <Image
                        source={{ uri: comparison.side_by_side.raw_photo_url }}
                        style={styles.sideBySideThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.sideBySideThumb, styles.centerContainer, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>No Raw Photo</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sideBySideCol}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>
                      Stage 3: Finished Dressed
                    </Text>
                    {comparison.side_by_side.post_photo_url ? (
                      <Image
                        source={{ uri: comparison.side_by_side.post_photo_url }}
                        style={styles.sideBySideThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.sideBySideThumb, styles.centerContainer, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: 8 }]}>
                          Pending Post-Dressing Capture
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            )}
          </View>
        )}

        {/* =========================================================================
            SECTION: DAMAGE & CAVITY INTELLIGENCE
           ========================================================================= */}
        {activeTab === 'DEFECTS' && (
          <View style={styles.tabContent}>
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FractureIntelligenceIcon size={18} color="#f59e0b" />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>Detected Surface Cavities & Cracks</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {defects.length} Detected
                </Text>
              </View>

              {defects.length > 0 ? (
                <View style={{ marginTop: spacing.sm, gap: 10 }}>
                  {defects.map((d: any, index: number) => (
                    <View
                      key={d.id || index}
                      style={[
                        styles.defectCardItem,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: d.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                        },
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={15} color={d.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'} />
                          <Text style={[styles.defectTypeTitle, { color: colors.text }]}>{d.defect_type}</Text>
                        </View>
                        <View
                          style={[
                            styles.calibPill,
                            {
                              backgroundColor:
                                d.dressing_eliminated
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: d.dressing_eliminated ? '#059669' : '#dc2626',
                              fontWeight: '700',
                              fontSize: 10,
                            }}
                          >
                            {d.dressing_eliminated ? '✓ ELIMINATED BY DRESSING' : 'ATTENTION REQUIRED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[typography.caption, { color: colors.text, marginTop: 4 }]}>
                        {d.description}
                      </Text>

                      {/* Cavity Metric Dimensions */}
                      <View style={styles.defectMetricGrid}>
                        <View style={styles.defectMetricBox}>
                          <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 9 }]}>Opening Size</Text>
                          <Text style={[styles.defectMetricVal, { color: colors.text }]}>
                            {d.opening_width_cm ? `${d.opening_width_cm.toFixed(1)}×${d.opening_length_cm?.toFixed(1)} cm` : '—'}
                          </Text>
                        </View>
                        <View style={styles.defectMetricBox}>
                          <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 9 }]}>Est. Depth</Text>
                          <Text style={[styles.defectMetricVal, { color: colors.text }]}>
                            {d.estimated_depth_cm ? `${d.estimated_depth_cm.toFixed(1)} cm` : '—'}
                          </Text>
                        </View>
                        <View style={styles.defectMetricBox}>
                          <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 9 }]}>Missing Stone</Text>
                          <Text style={[styles.defectMetricVal, { color: '#ef4444' }]}>
                            {d.missing_volume_cm3 ? `${d.missing_volume_cm3.toFixed(1)} cm³` : '—'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (rawMeas && (rawMeas.status === 'COMPLETED' || rawMeas.status === 'VERIFIED')) ? (
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                  <CheckCircle2 size={36} color="#059669" />
                  <Text style={[typography.body, { color: colors.text, marginTop: 8, fontWeight: '700' }]}>
                    Sound Surface Integrity
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 2 }]}>
                    No critical surface cavities or severe fractures mapped across verified scans.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                  <AlertTriangle size={36} color="#f59e0b" />
                  <Text style={[typography.body, { color: colors.text, marginTop: 8, fontWeight: '700' }]}>
                    Awaiting Defect Analysis
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 2 }]}>
                    Central AI has not yet completed defect scanning for this block.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { marginTop: spacing.md, width: '70%', justifyContent: 'center' }]}
                    onPress={() => handleTriggerAI('RAW')}
                  >
                    <Text style={[styles.primaryActionTitle, { textAlign: 'center' }]}>Run AI Defect Scan</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* =========================================================================
            SECTION: EVIDENCE & QUALITY
           ========================================================================= */}
        {activeTab === 'EVIDENCE' && (
          <View style={styles.tabContent}>
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Camera size={18} color="#0891b2" />
                  <Text style={[typography.cardTitle, { color: colors.text }]}>Photographic Evidence Archive</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {allImages.length} Accepted Files
                </Text>
              </View>

              {/* Viewpoint Coverage Grid */}
              <View style={[styles.viewGrid, { backgroundColor: colors.surfaceElevated, marginTop: spacing.sm }]}>
                {[
                  { label: 'Front', has: workspace.coverage?.front_captured },
                  { label: 'Rear', has: workspace.coverage?.back_captured },
                  { label: 'Left', has: workspace.coverage?.left_captured },
                  { label: 'Right', has: workspace.coverage?.right_captured },
                  { label: 'Top', has: workspace.coverage?.top_captured },
                  { label: 'Bottom', has: workspace.coverage?.bottom_captured },
                ].map((v) => (
                  <View key={v.label} style={styles.viewGridItem}>
                    <View
                      style={[
                        styles.viewGridDot,
                        { backgroundColor: v.has ? '#059669' : colors.borderSubtle },
                      ]}
                    />
                    <Text style={[typography.caption, { color: colors.text, fontSize: 11, fontWeight: '600' }]}>
                      {v.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Thumbnail Gallery */}
              <View style={styles.thumbnailGrid}>
                {allImages.map((img: any, idx: number) => (
                  <TouchableOpacity
                    key={img.id || idx}
                    onPress={() => {
                      setSelectedImageIndex(idx);
                      setGalleryModalVisible(true);
                    }}
                    style={styles.thumbnailWrapper}
                  >
                    <Image
                      source={{ uri: img.watermarked_url || img.file_url || img.url }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbnailViewLabel}>
                      <Text style={styles.thumbnailViewText}>{img.view_label || 'VIEW'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* 7. ADMIN CONTROLS (ARCHIVE / SAFE DELETE) */}
        <View style={styles.adminControlsRow}>
          {blockData.is_archived ? (
            <TouchableOpacity style={[styles.adminBtn, { borderColor: colors.borderSubtle }]} onPress={handleRestoreBlock}>
              <RefreshCw size={14} color={colors.textSecondary} />
              <Text style={[styles.adminBtnText, { color: colors.text }]}>Restore Record</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.adminBtn, { borderColor: colors.borderSubtle }]} onPress={() => setShowArchiveModal(true)}>
              <Archive size={14} color={colors.textSecondary} />
              <Text style={[styles.adminBtnText, { color: colors.text }]}>Soft Archive</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.adminBtn, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Trash2 size={14} color="#ef4444" />
            <Text style={[styles.adminBtnText, { color: '#ef4444' }]}>Safe Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* FULL SCREEN PHOTO VIEWER MODAL */}
      <Modal visible={galleryModalVisible} transparent animationType="fade">
        <View style={styles.galleryModalBg}>
          <TouchableOpacity
            style={styles.galleryCloseBtn}
            onPress={() => setGalleryModalVisible(false)}
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          {allImages[selectedImageIndex] && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: allImages[selectedImageIndex].watermarked_url || allImages[selectedImageIndex].file_url || allImages[selectedImageIndex].url }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              <View style={styles.galleryMetaBar}>
                <Text style={styles.galleryMetaTitle}>
                  {allImages[selectedImageIndex].view_label || 'QUARRY VIEW'} • {selectedImageIndex + 1}/{allImages.length}
                </Text>
                <Text style={styles.galleryMetaSub}>
                  {allImages[selectedImageIndex].captured_at ? new Date(allImages[selectedImageIndex].captured_at).toLocaleString() : 'Official AP Mining Evidence'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* MANUAL TAPE CALIBRATION MODAL */}
      {showRefModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>Record Manual Tape Ground-Truth</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                Record physical manual tape measurements (cm) to audit 3D photogrammetric precision.
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.borderSubtle }]}
                placeholder="Tape Length (cm) e.g. 240.5"
                placeholderTextColor={colors.textSecondary}
                value={tapeLength}
                onChangeText={setTapeLength}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.borderSubtle }]}
                placeholder="Tape Breadth (cm) e.g. 140.0"
                placeholderTextColor={colors.textSecondary}
                value={tapeBreadth}
                onChangeText={setTapeBreadth}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.borderSubtle }]}
                placeholder="Tape Height (cm) e.g. 120.0"
                placeholderTextColor={colors.textSecondary}
                value={tapeHeight}
                onChangeText={setTapeHeight}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.borderSubtle }]}
                placeholder="Weighbridge Mass (MT) Optional"
                placeholderTextColor={colors.textSecondary}
                value={tapeWeight}
                onChangeText={setTapeWeight}
                keyboardType="numeric"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={() => setShowRefModal(false)}>
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveTapeReference}
                  disabled={submittingRef}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{submittingRef ? 'Saving...' : 'Save Audit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ARCHIVE MODAL */}
      {showArchiveModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>Archive Block Record</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                Soft-archive block &quot;{blockData.identifier}&quot;. Forensic history will be retained.
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.borderSubtle }]}
                value={archiveReason}
                onChangeText={setArchiveReason}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={() => setShowArchiveModal(false)}>
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={handleArchiveBlock}
                  disabled={isArchiving}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{isArchiving ? 'Archiving...' : 'Confirm Archive'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* SAFE DELETE MODAL */}
      {showDeleteModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
                <ShieldAlert size={20} color="#ef4444" />
                <Text style={[typography.cardTitle, { color: '#ef4444' }]}>Delete Granite Block Record</Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Confirm deletion of {blockData.identifier}. Audit logs will be preserved.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={() => setShowDeleteModal(false)}>
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#ef4444' }]}
                  onPress={handleDeleteBlock}
                  disabled={isDeleting}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scrollContent: { paddingBottom: spacing.xxl },

  operationalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  blockIdTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },

  heroWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0c0f15',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroTopBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroTopBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBottomStamp: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(12, 15, 21, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stampIdText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  stampSubText: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  galleryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: 8,
  },
  tileCard: {
    width: (SCREEN_WIDTH - spacing.md * 2 - 16) / 3,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tileValue: { fontSize: 13, fontWeight: '800', marginVertical: 2 },

  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  primaryActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionTitle: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  primaryActionDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },

  advisoryBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  advisoryTitle: { fontWeight: '700', fontSize: 12 },
  advisoryCtaBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  advisoryCtaText: { color: '#000', fontWeight: '700', fontSize: 11 },

  tabScroll: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabChipText: { fontSize: 12 },

  tabContent: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calibPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  dimBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  dimBoxItem: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  dimBoxNumber: { fontSize: 15, fontWeight: '800', marginVertical: 2 },
  dividerLine: { height: 1, marginVertical: spacing.md },

  volDiagRow: { flexDirection: 'row', justifyContent: 'space-between' },
  volDiagNumber: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  tapeTable: { borderRadius: 8, padding: 8 },
  tapeTableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tapeTableHead: { fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'center' },
  tapeTableCell: { fontSize: 11, flex: 1, textAlign: 'center' },

  stepRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, borderLeftWidth: 2, paddingLeft: 8 },
  stepNumText: { fontWeight: '800', fontSize: 11 },
  stepTitleText: { fontWeight: '700', fontSize: 12 },

  simulationNoticePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderColor: '#0891b2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: spacing.sm,
  },
  simulationNoticeText: { color: '#0891b2', fontWeight: '800', fontSize: 10, flex: 1 },

  objectivePillsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  objPillItem: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  objPillLabel: { fontWeight: '800', fontSize: 12 },
  objPillSub: { fontSize: 9, marginTop: 2 },

  recoveryBarWrapper: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  recoveryBarFill: { height: '100%' },

  stepperControlRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  stepperPill: { flex: 1, paddingVertical: 5, borderRadius: 6, borderWidth: 1, alignItems: 'center' },

  cutOpCard: { padding: 8, borderRadius: 8, borderWidth: 1 },
  cutOpHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cutOrderBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  cutOrderText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cutOpTitle: { fontWeight: '700', fontSize: 12, flex: 1 },

  captureDressedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  captureDressedBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  reconcileTable: { borderRadius: 8, padding: 8 },
  reconcileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reconcileHead: { fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'center' },
  reconcileCell: { fontSize: 11, flex: 1, textAlign: 'center' },

  equationBox: { padding: 10, borderRadius: 8 },
  equationText: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  balancePillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  balancePillItem: { width: (SCREEN_WIDTH - spacing.md * 2 - 38) / 2, padding: 8, borderRadius: 6 },
  balancePillVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  sideBySideRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  sideBySideCol: { flex: 1 },
  sideBySideThumb: { width: '100%', height: 110, borderRadius: 8 },

  defectCardItem: { padding: 10, borderRadius: 8, borderWidth: 1 },
  defectTypeTitle: { fontWeight: '800', fontSize: 13 },
  defectMetricGrid: { flexDirection: 'row', gap: 6, marginTop: 6 },
  defectMetricBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.03)', padding: 6, borderRadius: 6, alignItems: 'center' },
  defectMetricVal: { fontWeight: '700', fontSize: 11, marginTop: 1 },

  viewGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderRadius: 8 },
  viewGridItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewGridDot: { width: 8, height: 8, borderRadius: 4 },

  thumbnailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  thumbnailWrapper: { width: (SCREEN_WIDTH - spacing.md * 2 - 40) / 3, height: 80, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailViewLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', paddingVertical: 2, alignItems: 'center' },
  thumbnailViewText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  adminControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminBtnText: { fontSize: 12, fontWeight: '600' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', borderRadius: 12, padding: spacing.lg },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 8, alignItems: 'center' },

  galleryModalBg: { flex: 1, backgroundColor: '#000' },
  galleryCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: SCREEN_WIDTH, height: '70%' },
  galleryMetaBar: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 8 },
  galleryMetaTitle: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  galleryMetaSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
});
