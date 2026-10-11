import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/store/useAuthStore';
import {
  createCaptureSession,
  uploadSessionImage,
  completeCaptureSession,
  startAnalysisJob,
  QualityAnalysisResult,
} from '../../src/api/images';
import { Check, AlertCircle, ArrowLeft, Flashlight } from 'lucide-react-native';

interface CapturedPhotoItem {
  uri: string;
  quality?: QualityAnalysisResult;
  analyzing: boolean;
  uploaded: boolean;
}

export default function CaptureScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [photos, setPhotos] = useState<CapturedPhotoItem[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<string | null>(null);

  const officerName = user?.name || 'Mining Officer';

  // Initialize capture session on mount
  useEffect(() => {
    initSession();
  }, [blockId]);

  const initSession = async () => {
    setSessionError(false);
    try {
      const session = await createCaptureSession(blockId as string, officerName);
      setSessionId(session.session_id);
    } catch (err) {
      console.warn('Could not initialize session on backend:', err);
      setSessionError(true);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <AlertCircle color={colors.warning} size={48} />
        <Text style={[typography.sectionTitle, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
          Camera Permission Required
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          GraniteMeasure AI requires camera access to capture multi-view photogrammetry of granite blocks.
        </Text>
        <TouchableOpacity
          style={[styles.grantBtn, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
          onPress={requestPermission}
        >
          <Text style={[typography.cardTitle, { color: '#FFF' }]}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: spacing.md }}
          onPress={() => Linking.openSettings()}
        >
          <Text style={[typography.body, { color: colors.primary }]}>Open App Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Show a recoverable error if session creation failed
  if (sessionError) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <AlertCircle color={colors.warning} size={48} />
        <Text style={[typography.sectionTitle, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
          Backend Unreachable
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          Could not create a capture session. Check that the GraniteMeasure backend is running and the device can reach it.
        </Text>
        <TouchableOpacity
          style={[styles.grantBtn, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
          onPress={initSession}
        >
          <Text style={[typography.cardTitle, { color: '#FFF' }]}>Retry Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: spacing.md }} onPress={() => router.back()}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
    if (!sessionId) {
      Alert.alert('No Session', 'Capture session is not ready. Please wait or tap Retry Connection.');
      return;
    }
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) return;

      const newIndex = photos.length;
      const newPhotoItem: CapturedPhotoItem = {
        uri: photo.uri,
        analyzing: true,
        uploaded: false,
      };

      setPhotos((prev) => [...prev, newPhotoItem]);

      // Upload image directly to session (backend runs quality + ArUco analysis on its end)
      // This eliminates the duplicate /images/analyze → /capture/sessions/{id}/images round-trip.
      // Retry is only attempted on network-level failures (no HTTP response), NOT on server errors,
      // to avoid duplicate BlockImage records if the server received the first request.
      let uploadSuccess = false;
      let quality: QualityAnalysisResult | undefined;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const uploadRes = await uploadSessionImage(sessionId, photo.uri, newIndex);
          // uploadRes.quality is the shape from capture.py — map to QualityAnalysisResult
          if (uploadRes.quality) {
            quality = {
              image_width: 0,
              image_height: 0,
              brightness: uploadRes.quality.brightness ?? 0,
              contrast: uploadRes.quality.contrast ?? 0,
              blur_score: uploadRes.quality.blur_score ?? 0,
              quality_status: uploadRes.quality.status === 'PASS' ? 'PASS' : 'REVIEW_REQUIRED',
              warnings: uploadRes.quality.warnings ?? [],
              detected_markers: uploadRes.quality.markers ?? [],
              marker_count: uploadRes.quality.marker_count ?? 0,
              metric_calibration_status: 'UNKNOWN',
            };
          }
          uploadSuccess = true;
          break;
        } catch (uploadErr: any) {
          const hasHttpResponse = !!uploadErr?.response;
          if (hasHttpResponse || attempt === 2) {
            // Server received it (HTTP error) — don't retry to avoid duplicates.
            // Also stop after the second network-level attempt.
            console.warn(`Upload attempt ${attempt} failed:`, uploadErr?.message ?? uploadErr);
            break;
          }
          // Network-level failure on attempt 1 (timeout, connection refused) — safe to retry once
        }
      }

      setPhotos((prev) =>
        prev.map((item, idx) =>
          idx === newIndex
            ? { ...item, quality, analyzing: false, uploaded: uploadSuccess }
            : item
        )
      );

      if (!uploadSuccess) {
        setCurrentWarning('Image upload failed — photo saved locally but not sent to backend.');
      } else if (quality?.warnings && quality.warnings.length > 0) {
        setCurrentWarning(quality.warnings[0]);
      } else {
        setCurrentWarning(null);
      }
    } catch (err) {
      console.warn('Capture error:', err);
      Alert.alert('Capture Failed', 'Could not take photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishCapture = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please capture at least 1 overlapping view of the granite block.');
      return;
    }

    const failedCount = photos.filter((p) => !p.uploaded).length;
    if (failedCount > 0 && failedCount === photos.length) {
      Alert.alert(
        'No Images Uploaded',
        'None of the captured photos were successfully uploaded to the backend. Check your network connection and try again.',
      );
      return;
    }
    if (failedCount > 0) {
      Alert.alert(
        `${failedCount} Photo${failedCount > 1 ? 's' : ''} Not Uploaded`,
        'Some photos could not be sent to the backend. The analysis will proceed with the uploaded images only. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => _submitJob() },
        ],
      );
      return;
    }
    await _submitJob();
  };

  const _submitJob = async () => {
    try {
      setIsProcessing(true);
      if (sessionId) {
        await completeCaptureSession(sessionId);
      }
      // Start analysis job on backend
      await startAnalysisJob(blockId as string);

      // Navigate to results screen — polling happens there
      router.replace(`/results/${blockId}`);
    } catch (err: any) {
      Alert.alert('Processing Failed', err.response?.data?.detail || err.message || 'Could not start measurement job');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[typography.cardTitle, { color: '#FFF' }]}>Block Multi-View Capture</Text>
          <Text style={[typography.caption, { color: '#AAA' }]}>
            {photos.filter((p) => p.uploaded).length}/{photos.length} Uploaded • Session #{sessionId || '—'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, torchOn && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
          onPress={() => setTorchOn(!torchOn)}
        >
          <Flashlight color={torchOn ? colors.warning : '#FFF'} size={24} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Camera Live Viewfinder */}
      <View style={styles.viewfinderContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
        >
          {/* Photogrammetry Framing Guide Overlay */}
          <View style={styles.guideOverlay}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <View style={styles.centerTarget}>
              <Text style={styles.guideText}>Center Granite Block with ArUco Marker</Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Real-Time Quality Guidance Pill */}
      {currentWarning && (
        <View style={[styles.warningPill, { backgroundColor: 'rgba(230, 81, 0, 0.9)' }]}>
          <AlertCircle color="#FFF" size={16} />
          <Text style={[typography.caption, { color: '#FFF', marginLeft: 6 }]}>{currentWarning}</Text>
        </View>
      )}

      {/* Thumbnail Carousel */}
      {photos.length > 0 && (
        <View style={styles.thumbnailStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map((item, index) => (
              <View key={index} style={styles.thumbWrapper}>
                <Image source={{ uri: item.uri }} style={styles.thumbImage} />
                {item.analyzing ? (
                  <View style={styles.thumbBadgeLoading}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                ) : item.quality ? (
                  <View
                    style={[
                      styles.thumbBadge,
                      { backgroundColor: item.quality.quality_status === 'PASS' ? colors.success : colors.warning },
                    ]}
                  >
                    <Text style={styles.thumbBadgeText}>
                      {item.quality.marker_count > 0 ? `Mk:${item.quality.marker_count}` : 'No Mk'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <View style={{ width: 64 }} />

          {/* Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterBtn, isProcessing && { opacity: 0.6 }]}
            onPress={handleCapturePhoto}
            disabled={isProcessing}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Finish & Measure Button */}
          <TouchableOpacity
            style={[
              styles.finishBtn,
              { backgroundColor: photos.length > 0 ? colors.primary : '#444' },
            ]}
            onPress={handleFinishCapture}
            disabled={photos.length === 0 || isProcessing}
          >
            <Check color="#FFF" size={24} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grantBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 8 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iconBtn: { padding: spacing.sm, borderRadius: 20 },
  titleContainer: { alignItems: 'center' },
  viewfinderContainer: { flex: 1 },
  guideOverlay: {
    flex: 1,
    margin: 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#16B58A' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#16B58A' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#16B58A' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#16B58A' },
  centerTarget: { padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6 },
  guideText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  warningPill: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    zIndex: 20,
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: spacing.md,
    zIndex: 20,
  },
  thumbWrapper: { width: 52, height: 52, marginRight: 8, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#FFF' },
  thumbImage: { width: '100%', height: '100%' },
  thumbBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 1 },
  thumbBadgeLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  thumbBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: spacing.lg,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  finishBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
