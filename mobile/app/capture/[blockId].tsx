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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import {
  createCaptureSession,
  uploadSessionImage,
  completeCaptureSession,
  startAnalysisJob,
  analyzeSingleImage,
  QualityAnalysisResult,
} from '../../src/api/images';
import { Camera as CameraIcon, Check, AlertCircle, ArrowLeft, Flashlight, RefreshCw, UploadCloud } from 'lucide-react-native';

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

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [photos, setPhotos] = useState<CapturedPhotoItem[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<string | null>(null);

  // Initialize capture session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await createCaptureSession(blockId as string, 'Mining Officer');
        setSessionId(session.session_id);
      } catch (err) {
        console.warn('Could not initialize session on backend:', err);
      }
    })();
  }, [blockId]);

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
      </SafeAreaView>
    );
  }

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
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

      // Analyze image quality & ArUco markers in real time
      try {
        const analysisRes = await analyzeSingleImage(photo.uri);
        const quality = analysisRes.analysis;

        // If capture session exists, upload image to session
        if (sessionId) {
          await uploadSessionImage(sessionId, photo.uri, newIndex);
        }

        setPhotos((prev) =>
          prev.map((item, idx) =>
            idx === newIndex
              ? { ...item, quality, analyzing: false, uploaded: true }
              : item
          )
        );

        if (quality.warnings && quality.warnings.length > 0) {
          setCurrentWarning(quality.warnings[0]);
        } else {
          setCurrentWarning(null);
        }
      } catch (err) {
        console.warn('Real-time quality analysis error:', err);
        setPhotos((prev) =>
          prev.map((item, idx) =>
            idx === newIndex
              ? { ...item, analyzing: false, uploaded: false }
              : item
          )
        );
      }
    } catch (err) {
      console.warn('Capture error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishCapture = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please capture at least 1 overlapping view of the granite block.');
      return;
    }

    try {
      setIsProcessing(true);
      if (sessionId) {
        await completeCaptureSession(sessionId);
      }
      // Start analysis job on backend
      await startAnalysisJob(blockId as string);

      // Navigate to results screen (or analysis progress)
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
            {photos.length} Captured • Session #{sessionId || 'Active'}
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
