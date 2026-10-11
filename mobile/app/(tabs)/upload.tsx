import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { uploadQueue, QueueItem } from '../../src/services/uploadQueue';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Trash2,
  HardDrive,
  Clock,
  Layers,
  ArrowUpCircle,
} from 'lucide-react-native';
import { ShieldEmblemIcon } from '../../src/components/DomainIcons';

export default function UploadCenterTab() {
  const { colors } = useTheme();
  const { language, t } = useTranslation();
  const { simpleMode } = useSettingsStore();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe((updatedItems) => {
      setItems(updatedItems);
    });
    return () => unsubscribe();
  }, []);

  const handleProcessQueue = async () => {
    try {
      setIsProcessing(true);
      const res = await uploadQueue.processQueue();
      if (res.failed > 0) {
        Alert.alert(
          language === 'te' ? 'అప్‌లోడ్ పూర్తయింది' : 'Sync Finished',
          language === 'te'
            ? `${res.uploaded} ఫోటోలు విజయవంతంగా అప్‌లోడ్ అయ్యాయి. ${res.failed} విఫలమయ్యాయి.`
            : `${res.uploaded} photos uploaded. ${res.failed} failed.`
        );
      }
    } catch (err: any) {
      Alert.alert(
        language === 'te' ? 'అప్‌లోడ్ లోపం' : 'Upload Error',
        err?.message || 'Could not process upload queue'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsProcessing(true);
    try {
      await uploadQueue.retryFailed();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearCompleted = async () => {
    await uploadQueue.clearCompleted();
  };

  const handleClearAll = () => {
    Alert.alert(
      language === 'te' ? 'క్యూ క్లియర్ చేయాలా?' : 'Clear Entire Queue?',
      language === 'te'
        ? 'ఇది పెండింగ్‌లో ఉన్న అన్ని అప్‌లోడ్‌లను తొలగిస్తుంది.'
        : 'This will remove all pending and completed upload entries from local buffer.',
      [
        { text: language === 'te' ? 'రద్దు' : 'Cancel', style: 'cancel' },
        {
          text: language === 'te' ? 'తొలగించు' : 'Clear',
          style: 'destructive',
          onPress: () => uploadQueue.clearAll(),
        },
      ]
    );
  };

  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'uploading').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const uploadedCount = items.filter((i) => i.status === 'uploaded').length;

  const renderItem = ({ item }: { item: QueueItem }) => {
    const isFailed = item.status === 'failed';
    const isUploading = item.status === 'uploading';
    const isDone = item.status === 'uploaded';

    return (
      <View style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.blockBadge}>
            <Layers size={14} color={colors.primary} />
            <Text style={[styles.blockBadgeText, { color: colors.primary }]}>
              {language === 'te' ? 'బ్లాక్' : 'Block'} #{item.blockId}
            </Text>
          </View>
          <Text style={[styles.sequenceText, { color: colors.textSecondary }]}>
            {language === 'te' ? 'ఫోటో' : 'Photo'} #{item.sequenceNumber}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statusRow}>
            {isUploading && (
              <View style={styles.statusPill}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {language === 'te' ? 'అప్‌లోడ్ అవుతోంది...' : 'Uploading...'}
                </Text>
              </View>
            )}
            {isDone && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {language === 'te' ? 'సమకాలీకరించబడింది' : 'Synced to Server'}
                </Text>
              </View>
            )}
            {isFailed && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <AlertTriangle size={16} color={colors.error || '#ef4444'} />
                <Text style={[styles.statusText, { color: colors.error || '#ef4444' }]}>
                  {language === 'te' ? 'విఫలమైంది' : 'Upload Failed'}
                </Text>
              </View>
            )}
            {item.status === 'pending' && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Clock size={16} color="#f59e0b" />
                <Text style={[styles.statusText, { color: '#f59e0b' }]}>
                  {language === 'te' ? 'క్యూలో ఉంది' : 'Queued Offline'}
                </Text>
              </View>
            )}

            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {item.error ? (
            <Text style={[styles.errorDetail, { color: colors.error || '#ef4444' }]}>
              {item.error}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <UploadCloud size={24} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === 'te' ? 'అప్‌లోడ్ కేంద్రం' : 'Upload Center'}
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {language === 'te'
              ? 'ఆఫ్‌లైన్ క్వారీ ఫోటో బఫర్ & బ్యాక్‌గ్రౌండ్ సింక్'
              : 'Offline pit photo buffer & server synchronization'}
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={handleClearAll}
          >
            <Trash2 size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Simple Mode One-Tap Banner */}
      {simpleMode && (
        <View style={[styles.simpleBanner, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.primary }]}>
          <ShieldEmblemIcon size={28} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.simpleBannerTitle, { color: colors.primary }]}>
              {language === 'te' ? 'సులభ సమకాలీకరణ విధానం' : 'One-Tap Sync Mode'}
            </Text>
            <Text style={[styles.simpleBannerDesc, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'క్వారీ నుండి బయటకు వచ్చినప్పుడు సింక్ బటన్ నొక్కండి.'
                : 'Tap Sync button when cellular network is available.'}
            </Text>
          </View>
        </View>
      )}

      {/* Stats Counter Bar */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{items.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'మొత్తం' : 'Total'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'పెండింగ్' : 'Pending'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{uploadedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'సింక్ అయింది' : 'Synced'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.error || '#ef4444' }]}>{failedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'te' ? 'విఫలమైనవి' : 'Failed'}
          </Text>
        </View>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[
            styles.syncButton,
            { backgroundColor: colors.primary, opacity: isProcessing ? 0.7 : 1 },
          ]}
          onPress={handleProcessQueue}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <RotateCw size={18} color="#000" />
          )}
          <Text style={styles.syncButtonText}>
            {isProcessing
              ? language === 'te'
                ? 'సమకాలీకరిస్తోంది...'
                : 'Syncing Queue...'
              : language === 'te'
              ? 'ఇప్పుడే సింక్ చేయండి'
              : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        {failedCount > 0 && (
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.error || '#ef4444' }]}
            onPress={handleRetryFailed}
            disabled={isProcessing}
          >
            <RotateCw size={16} color={colors.error || '#ef4444'} />
            <Text style={[styles.secondaryButtonText, { color: colors.error || '#ef4444' }]}>
              {language === 'te' ? 'మళ్లీ ప్రయత్నించు' : 'Retry Failed'}
            </Text>
          </TouchableOpacity>
        )}

        {uploadedCount > 0 && (
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handleClearCompleted}
          >
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {language === 'te' ? 'పూర్తయినవి క్లియర్' : 'Clear Synced'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Queue List / Empty State */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <CheckCircle2 size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'te' ? 'అన్ని ఫోటోలు సమకాలీకరించబడ్డాయి' : 'All Photos Synchronized'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'స్థానిక పరికరంలో పెండింగ్ ఫోటోలు ఏవీ లేవు. తీసిన అన్ని ఫోటోలు సర్వర్‌లో భద్రంగా నమోదయ్యాయి.'
                : 'No pending uploads buffered locally. All field multi-view capture sessions are fully synced to the central intelligence server.'}
            </Text>
            <View style={[styles.bufferNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <HardDrive size={16} color={colors.accent || '#06b6d4'} />
              <Text style={[styles.bufferNoteText, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'ఆఫ్‌లైన్ రక్షణ: నెట్‌వర్క్ లేని లోతైన క్వారీలలో తీసిన ఫోటోలు ఆటోమేటిక్‌గా ఇక్కడ నిల్వ చేయబడతాయి.'
                  : 'Offline Safety: Photos captured deep in pits without network are safely preserved here.'}
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  clearBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  simpleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  simpleBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fonts.bold,
  },
  simpleBannerDesc: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: typography.fonts.regular,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.fonts.bold,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: typography.fonts.medium,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  syncButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.fonts.medium,
  },
  listContent: {
    padding: spacing.lg,
    gap: 10,
  },
  queueCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fonts.semiBold,
  },
  sequenceText: {
    fontSize: 12,
    fontFamily: typography.fonts.regular,
  },
  cardBody: {},
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.fonts.medium,
  },
  timeText: {
    fontSize: 11,
    fontFamily: typography.fonts.regular,
  },
  errorDetail: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: typography.fonts.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: typography.fonts.semiBold,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: typography.fonts.regular,
  },
  bufferNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bufferNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: typography.fonts.regular,
  },
});
