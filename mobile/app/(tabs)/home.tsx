import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { getDashboardStats, DashboardStats, getBlocks, GraniteBlockItem } from '../../src/api/blocks';
import { uploadQueue } from '../../src/services/uploadQueue';
import { apiClient } from '../../src/api/client';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Layers,
  PlusCircle,
  Camera,
  UploadCloud,
  Wifi,
  WifiOff,
  ChevronRight,
  Sparkles,
  MapPin,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  RotateCw,
  Cpu,
  Ruler,
  FileCheck,
  Sun,
  Moon,
  Globe,
  HardDrive,
  ShieldAlert,
  ArrowRight,
  Box,
} from 'lucide-react-native';
import {
  GraniteBlockIcon,
  QuarryAtlasIcon,
  ShieldEmblemIcon,
  MetricRulerIcon,
  VisionPipelineIcon,
  FractureIntelligenceIcon,
  CutLabIcon,
  GeoTwinIcon,
} from '../../src/components/DomainIcons';

type NetworkSyncState = 'ONLINE' | 'SERVER_UNAVAILABLE' | 'SYNCHRONIZING' | 'ALL_SYNCED';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const { user, activeQuarryId, activeQuarryName } = useAuthStore();
  const { simpleMode, toggleSimpleMode } = useSettingsStore();

  const [stats, setStats] = useState<DashboardStats>({
    total_blocks: 0,
    pending_analysis: 0,
    completed_measurements: 0,
    needs_verification: 0,
    recent_blocks: [],
  });
  const [blocksList, setBlocksList] = useState<GraniteBlockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingUploadCount, setPendingUploadCount] = useState(0);
  const [failedUploadCount, setFailedUploadCount] = useState(0);
  const [networkState, setNetworkState] = useState<NetworkSyncState>('ONLINE');

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, blocksData] = await Promise.all([
        getDashboardStats().catch(() => null),
        getBlocks().catch(() => []),
      ]);

      if (statsData) {
        setStats(statsData);
      }
      setBlocksList(blocksData || []);

      // Connectivity probe
      try {
        await apiClient.get('/health', { timeout: 4000 });
        const pending = await uploadQueue.getPendingCount();
        setNetworkState(pending > 0 ? 'SYNCHRONIZING' : 'ONLINE');
      } catch {
        setNetworkState('SERVER_UNAVAILABLE');
      }
    } catch (err) {
      console.warn('Could not load dashboard data:', err);
      setNetworkState('SERVER_UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const unsubscribe = uploadQueue.subscribe((items) => {
      const pending = items.filter((i) => i.status === 'pending' || i.status === 'uploading').length;
      const failed = items.filter((i) => i.status === 'failed' || i.status === 'rejected').length;
      setPendingUploadCount(pending);
      setFailedUploadCount(failed);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    return () => unsubscribe();
  }, []);

  // Quick Action: Take Photo (Camera)
  const handlePrimaryTakePhoto = () => {
    if (blocksList.length > 0) {
      router.push(`/capture/${blocksList[0].id}`);
    } else {
      router.push('/block/new');
    }
  };

  // Quick Action: Upload Photos (Gallery Picker)
  const handlePrimaryUploadPhotos = async () => {
    if (blocksList.length > 0) {
      router.push(`/capture/${blocksList[0].id}`);
    } else {
      router.push('/block/new');
    }
  };

  // Genuine Latest Processed Block
  const latestMeasuredBlock = blocksList.find((b) => b.measurement != null) || blocksList[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} tintColor={colors.primary} />
        }
      >
        {/* =========================================================================
            A. PREMIUM OPERATIONAL HEADER
           ========================================================================= */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerBranding}>
            <View style={styles.brandBadgeRow}>
              <ShieldEmblemIcon size={18} color={colors.primary} />
              <Text style={[styles.brandBadgeText, { color: colors.primary }]}>
                {language === 'te' ? 'ఆంధ్రప్రదేశ్ మైనింగ్ విభాగం' : 'Govt of Andhra Pradesh Mines'}
              </Text>
            </View>
            <Text style={[styles.appTitle, { color: colors.text }]}>GraniteMeasure AI</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'ఫీల్డ్ కమాండ్ సెంటర్ • గ్రానైట్ కొలత ప్లాట్‌ఫారమ్'
                : 'Field Command Center • Stone Intelligence Platform'}
            </Text>
          </View>

          {/* Quick Header Controls (Language, Theme, Mode) */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => setLanguage(language === 'en' ? 'te' : 'en')}
            >
              <Globe size={15} color={colors.primary} />
              <Text style={[styles.langText, { color: colors.text }]}>
                {language === 'en' ? 'తెలుగు' : 'EN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun size={15} color="#f59e0b" />
              ) : (
                <Moon size={15} color={colors.accent || '#06b6d4'} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modePillBtn,
                {
                  backgroundColor: simpleMode ? 'rgba(16, 185, 129, 0.15)' : colors.surfaceElevated,
                  borderColor: simpleMode ? colors.primary : colors.border,
                },
              ]}
              onPress={toggleSimpleMode}
            >
              <Sliders size={13} color={simpleMode ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modePillText, { color: simpleMode ? colors.primary : colors.textSecondary }]}>
                {simpleMode ? (language === 'te' ? 'సులభం' : 'Simple') : (language === 'te' ? 'ప్రో' : 'Pro')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Workspace Identity & Active Quarry Concession Context Banner */}
        <View style={[styles.contextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.contextLeft}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/quarries')}
          >
            <View style={styles.quarryIconBox}>
              <QuarryAtlasIcon size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.roleTagRow}>
                <Text style={[styles.workspaceRoleText, { color: colors.primary }]}>
                  {user?.role || 'Mining Officer'} Workspace
                </Text>
                <Text style={[styles.dividerDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.districtText, { color: colors.textSecondary }]}>Prakasam Dist</Text>
              </View>
              <Text style={[styles.quarryNameText, { color: colors.text }]} numberOfLines={1}>
                {activeQuarryName || (language === 'te' ? 'క్వారీని ఎంచుకోండి' : 'Select Active Quarry')}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Truthful Network Synchronization Indicator */}
          <View style={[styles.networkDivider, { backgroundColor: colors.border }]} />
          <View style={styles.networkStatusRow}>
            {networkState === 'ONLINE' && (
              <>
                <Wifi size={13} color={colors.primary} />
                <Text style={[styles.networkText, { color: colors.primary }]}>
                  {language === 'te' ? 'ఆన్‌లైన్ — సర్వర్ కనెక్ట్ అయింది' : 'Online — Server Reachable'}
                </Text>
              </>
            )}
            {networkState === 'SERVER_UNAVAILABLE' && (
              <>
                <WifiOff size={13} color="#f59e0b" />
                <Text style={[styles.networkText, { color: '#f59e0b' }]}>
                  {language === 'te' ? 'సర్వర్ అందుబాటులో లేదు — ఆఫ్‌లైన్ సేవ్' : 'Server Unavailable — Saved to Device'}
                </Text>
              </>
            )}
            {networkState === 'SYNCHRONIZING' && (
              <>
                <RotateCw size={13} color={colors.accent || '#06b6d4'} />
                <Text style={[styles.networkText, { color: colors.accent || '#06b6d4' }]}>
                  {language === 'te' ? 'సింక్రొనైజ్ అవుతోంది...' : 'Synchronizing Queue...'}
                </Text>
              </>
            )}
            {networkState === 'ALL_SYNCED' && (
              <>
                <CheckCircle2 size={13} color={colors.primary} />
                <Text style={[styles.networkText, { color: colors.primary }]}>
                  {language === 'te' ? 'అన్నీ సమకాలీకరించబడ్డాయి' : 'All Captures Synced'}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* =========================================================================
            B. INTELLIGENT PRIMARY CAPTURE PANEL (CAMERA + GALLERY)
           ========================================================================= */}
        <View style={styles.primaryCapturePanel}>
          {/* Action 1: Take Photo / ఫోటో తీయండి */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.primaryActionCard, { backgroundColor: colors.primary }]}
            onPress={handlePrimaryTakePhoto}
          >
            <View style={styles.actionIconCircle}>
              <Camera size={26} color="#000" />
            </View>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>
                {language === 'te' ? 'ఫోటో తీయండి' : 'Take Photo'}
              </Text>
              <Text style={styles.actionCardSubtitle}>
                {language === 'te'
                  ? 'కెమెరాతో రాయి చుట్టూ మల్టీ-వ్యూ ఫోటోలు తీయండి'
                  : 'Live multi-view capture with ArUco marker guidance'}
              </Text>
            </View>
            <ChevronRight size={20} color="#000" />
          </TouchableOpacity>

          {/* Action 2: Upload Photos / ఫోటోలు అప్లోడ్ చేయండి */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.primaryActionCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={handlePrimaryUploadPhotos}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <ImageIcon size={26} color={colors.accent || '#06b6d4'} />
            </View>
            <View style={styles.actionCardContent}>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {language === 'te' ? 'ఫోటోలు అప్‌లోడ్ చేయండి' : 'Upload Photos'}
              </Text>
              <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'గ్యాలరీ నుండి ఎంచుకోండి (AI రాయి ధృవీకరణతో)'
                  : 'Select existing pit photos from mobile gallery'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Pending Uploads Alert Banner (if items queued) */}
        {pendingUploadCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.pendingAlertCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#f59e0b' }]}
            onPress={() => router.push('/(tabs)/upload')}
          >
            <HardDrive size={22} color="#f59e0b" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.pendingAlertTitle, { color: '#f59e0b' }]}>
                {pendingUploadCount} {language === 'te' ? 'ఫోటోలు ఆఫ్‌లైన్‌లో నిల్వ ఉన్నాయి' : 'Photos Buffered Offline'}
              </Text>
              <Text style={[styles.pendingAlertSub, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'సర్వర్‌తో సింక్ చేయడానికి ఇక్కడ తాకండి.'
                  : 'Tap to view upload queue and sync buffered field evidence.'}
              </Text>
            </View>
            <ChevronRight size={18} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* =========================================================================
            C. REAL-TIME OPERATIONAL OVERVIEW (PERSISTED DATA ONLY)
           ========================================================================= */}
        <View style={styles.overviewSection}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {language === 'te' ? 'రియల్-టైమ్ కార్యాచరణ అవలోకనం' : 'Operational Intelligence Overview'}
          </Text>

          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Layers size={18} color={colors.primary} />
              <Text style={[styles.metricNumber, { color: colors.text }]}>{stats.total_blocks}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'మొత్తం రాళ్ళు' : 'Total Blocks'}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <CheckCircle size={18} color={colors.primary} />
              <Text style={[styles.metricNumber, { color: colors.primary }]}>
                {stats.completed_measurements}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'కొలతలు పూర్తయ్యాయి' : 'Measured'}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Cpu size={18} color={colors.accent || '#06b6d4'} />
              <Text style={[styles.metricNumber, { color: colors.accent || '#06b6d4' }]}>
                {stats.pending_analysis}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'AI ప్రాసెసింగ్' : 'AI In Progress'}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <UploadCloud size={18} color="#f59e0b" />
              <Text style={[styles.metricNumber, { color: '#f59e0b' }]}>{pendingUploadCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'పెండింగ్ అప్‌లోడ్స్' : 'Pending Upload'}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AlertTriangle size={18} color={stats.needs_verification > 0 ? '#ef4444' : colors.textSecondary} />
              <Text
                style={[
                  styles.metricNumber,
                  { color: stats.needs_verification > 0 ? '#ef4444' : colors.text },
                ]}
              >
                {stats.needs_verification}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'ధృవీకరణ అవసరం' : 'Need Review'}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <QuarryAtlasIcon size={18} color={colors.primary} />
              <Text style={[styles.metricNumber, { color: colors.text }]}>1</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {language === 'te' ? 'ప్రస్తుత క్వారీ' : 'Active Pit'}
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            D. AI INTELLIGENCE PREVIEW (LATEST GENUINE RESULTS)
           ========================================================================= */}
        <View style={styles.aiPreviewSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                {language === 'te' ? 'ఇటీవలి AI విశ్లేషణ ప్రివ్యూ' : 'AI Intelligence Preview'}
              </Text>
            </View>
            {latestMeasuredBlock && (
              <TouchableOpacity onPress={() => router.push(`/block/${latestMeasuredBlock.id}`)}>
                <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
                  {language === 'te' ? 'వివరాలు' : 'Inspect'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {latestMeasuredBlock && latestMeasuredBlock.measurement ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.aiPreviewCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => router.push(`/block/${latestMeasuredBlock.id}`)}
            >
              <View style={styles.aiCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiBlockId, { color: colors.text }]}>
                    {latestMeasuredBlock.identifier}
                  </Text>
                  <Text style={[styles.aiColorVariety, { color: colors.accent || '#06b6d4' }]}>
                    {latestMeasuredBlock.color_group} • {latestMeasuredBlock.block_type || 'RAW'}
                  </Text>
                </View>
                <StatusBadge status={latestMeasuredBlock.measurement.status as any} />
              </View>

              <View style={[styles.aiDimensionsBox, { backgroundColor: colors.surfaceElevated }]}>
                <View style={styles.aiDimItem}>
                  <Text style={[styles.aiDimLabel, { color: colors.textSecondary }]}>Length</Text>
                  <Text style={[styles.aiDimVal, { color: colors.text }]}>
                    {latestMeasuredBlock.measurement.length_cm?.toFixed(1) || '—'} cm
                  </Text>
                </View>
                <View style={styles.aiDimDivider} />
                <View style={styles.aiDimItem}>
                  <Text style={[styles.aiDimLabel, { color: colors.textSecondary }]}>Breadth</Text>
                  <Text style={[styles.aiDimVal, { color: colors.text }]}>
                    {latestMeasuredBlock.measurement.breadth_cm?.toFixed(1) || '—'} cm
                  </Text>
                </View>
                <View style={styles.aiDimDivider} />
                <View style={styles.aiDimItem}>
                  <Text style={[styles.aiDimLabel, { color: colors.textSecondary }]}>Height</Text>
                  <Text style={[styles.aiDimVal, { color: colors.text }]}>
                    {latestMeasuredBlock.measurement.height_cm?.toFixed(1) || '—'} cm
                  </Text>
                </View>
                <View style={styles.aiDimDivider} />
                <View style={styles.aiDimItem}>
                  <Text style={[styles.aiDimLabel, { color: colors.textSecondary }]}>Volume</Text>
                  <Text style={[styles.aiDimVal, { color: colors.primary }]}>
                    {latestMeasuredBlock.measurement.volume_m3?.toFixed(3) || '—'} m³
                  </Text>
                </View>
              </View>

              <View style={styles.aiCardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MetricRulerIcon size={14} color={colors.primary} />
                  <Text style={[styles.aiFooterText, { color: colors.textSecondary }]}>
                    Calibration: {latestMeasuredBlock.measurement.calibration_status || 'ARUCO_CALIBRATED'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.aiFooterAction, { color: colors.primary }]}>
                    {language === 'te' ? '3D మోడల్ తెరవండి' : '3D Geometry Twin'}
                  </Text>
                  <ChevronRight size={14} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.emptyAiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <GraniteBlockIcon size={34} color={colors.textSecondary} />
              <Text style={[styles.emptyAiTitle, { color: colors.text }]}>
                {language === 'te' ? 'ఇంకా కొలతలు లేవు' : 'No Measured Blocks Yet'}
              </Text>
              <Text style={[styles.emptyAiDesc, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'మొదటి గ్రానైట్ రాయిని నమోదు చేసి ఫోటోలు తీయండి. సెంట్రల్ AI ఆటోమేటిక్‌గా 3D కొలతలను అందిస్తుంది.'
                  : 'Register a block and capture multi-view photos to activate central 3D reconstruction and statutory seigniorage assessment.'}
              </Text>
            </View>
          )}
        </View>

        {/* =========================================================================
            E. SMART WORKFLOW TRACKER
           ========================================================================= */}
        <View style={styles.workflowSection}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {language === 'te' ? 'స్మార్ట్ వర్క్‌ఫ్లో ట్రాకర్' : 'Measurement Workflow Pipeline'}
          </Text>

          <View style={[styles.workflowBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.workflowStep}
              onPress={() => router.push('/(tabs)/quarries')}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.primary }]}>
                <QuarryAtlasIcon size={14} color="#000" />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.text }]}>1. Pit</Text>
            </TouchableOpacity>
            <View style={[styles.workflowLine, { backgroundColor: colors.primary }]} />

            <TouchableOpacity
              style={styles.workflowStep}
              onPress={() => router.push('/block/new')}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.primary }]}>
                <GraniteBlockIcon size={14} color="#000" />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.text }]}>2. Tag</Text>
            </TouchableOpacity>
            <View style={[styles.workflowLine, { backgroundColor: colors.primary }]} />

            <TouchableOpacity
              style={styles.workflowStep}
              onPress={handlePrimaryTakePhoto}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.primary }]}>
                <Camera size={14} color="#000" />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.text }]}>3. Photos</Text>
            </TouchableOpacity>
            <View style={[styles.workflowLine, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.workflowStep}
              onPress={() => router.push('/(tabs)/blocks')}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <Cpu size={14} color={colors.accent || '#06b6d4'} />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>4. AI</Text>
            </TouchableOpacity>
            <View style={[styles.workflowLine, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.workflowStep}
              onPress={() => router.push('/(tabs)/blocks')}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <Ruler size={14} color={colors.textSecondary} />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>5. Metric</Text>
            </TouchableOpacity>
            <View style={[styles.workflowLine, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.workflowStep}
              onPress={() => router.push('/(tabs)/blocks')}
            >
              <View style={[styles.workflowCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <FileCheck size={14} color={colors.textSecondary} />
              </View>
              <Text style={[styles.workflowLabel, { color: colors.textSecondary }]}>6. Audit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =========================================================================
            F. RECENT GRANITE BLOCKS (PERSISTED ONLY)
           ========================================================================= */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {language === 'te' ? 'ఇటీవలి గ్రానైట్ రాళ్ళు' : 'Recent Granite Blocks'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/blocks')}>
              <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
                {language === 'te' ? 'అన్నీ చూడండి' : 'View Registry'}
              </Text>
            </TouchableOpacity>
          </View>

          {blocksList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <GraniteBlockIcon size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
                {language === 'te' ? 'రాళ్ళు ఏవీ నమోదు కాలేదు' : 'No Granite Blocks Registered Yet'}
              </Text>
              <Text style={[styles.emptyCardDesc, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'కొత్త రాయిని నమోదు చేయడానికి పైన ఉన్న "ఫోటో తీయండి" బటన్ నొక్కండి.'
                  : 'Tap "Take Photo" or "Upload Photos" above to begin photogrammetric block registration.'}
              </Text>
            </Card>
          ) : (
            blocksList.slice(0, 4).map((b) => (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/block/${b.id}`)}
                style={{ marginBottom: spacing.xs }}
              >
                <Card style={styles.recentBlockCard}>
                  <View style={styles.recentRow}>
                    <View style={styles.blockIconBox}>
                      <GraniteBlockIcon size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.blockIdentifier, { color: colors.text }]}>
                        {b.identifier}
                      </Text>
                      <Text style={[styles.blockSub, { color: colors.accent || '#06b6d4' }]}>
                        {b.color_group} • {b.block_type || 'RAW'}
                      </Text>
                      <Text style={[styles.blockDate, { color: colors.textSecondary }]}>
                        {b.registered_at ? new Date(b.registered_at).toLocaleDateString() : 'Today'}
                      </Text>
                    </View>
                    <StatusBadge status={b.status as any} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerBranding: {
    flex: 1,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  modePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  contextBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quarryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceRoleText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  dividerDot: {
    marginHorizontal: 4,
    fontSize: 10,
  },
  districtText: {
    fontSize: 11,
    fontFamily: typography.fonts.regular,
  },
  quarryNameText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: typography.fonts.semiBold,
  },
  networkDivider: {
    height: 1,
    marginVertical: 10,
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  primaryCapturePanel: {
    gap: 10,
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionCardTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  actionCardSubtitle: {
    color: 'rgba(0,0,0,0.75)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  pendingAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  pendingAlertSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  overviewSection: {},
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: typography.fonts.semiBold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '31.5%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    fontFamily: typography.fonts.bold,
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: typography.fonts.medium,
  },
  aiPreviewSection: {},
  aiPreviewCard: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  aiBlockId: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  aiColorVariety: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.medium,
  },
  aiDimensionsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  aiDimItem: {
    alignItems: 'center',
  },
  aiDimLabel: {
    fontSize: 10,
    fontFamily: typography.fonts.regular,
  },
  aiDimVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: typography.fonts.semiBold,
  },
  aiDimDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  aiCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  aiFooterText: {
    fontSize: 11,
    fontFamily: typography.fonts.regular,
  },
  aiFooterAction: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  emptyAiCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyAiTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    fontFamily: typography.fonts.semiBold,
  },
  emptyAiDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    fontFamily: typography.fonts.regular,
  },
  workflowSection: {},
  workflowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  workflowStep: {
    alignItems: 'center',
  },
  workflowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: typography.fonts.semiBold,
  },
  workflowLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
  },
  recentSection: {
    marginBottom: spacing.xxl,
  },
  recentBlockCard: {
    padding: spacing.md,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockIdentifier: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fonts.bold,
  },
  blockSub: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.medium,
  },
  blockDate: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
    fontFamily: typography.fonts.semiBold,
  },
  emptyCardDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    fontFamily: typography.fonts.regular,
  },
});
