import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { api } from '../services/api';
import { useToast } from '../components/common/ToastProvider';

export default function HandoverScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams(); // borrow_id and type ('handover' or 'return')
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    let timer: any;
    if (isRecording && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0) {
      handleStopRecording();
    }
    return () => clearInterval(timer);
  }, [isRecording, countdown]);

  const handleStartRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setCountdown(5);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 5,
        });
        if (video) {
          uploadVideo(video.uri);
        }
      } catch (e) {
        console.error("Recording failed", e);
        setIsRecording(false);
      }
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (uri: string) => {
    showToast('Video captured! Uploading...', 'info');
    
    try {
      // 1. Upload to S3 via backend
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'handover.mp4';
      formData.append('file', {
        uri,
        name: filename,
        type: 'video/mp4',
      } as any);

      // We need to get the token again or use a central service
      const { getToken, API_URL } = require('../services/api');
      const token = await getToken();

      const uploadRes = await fetch(`${API_URL}/tools/upload`, {
        method: 'POST',
        body: formData as any,
        headers: {
           'Authorization': `Bearer ${token}`
        }
      });
      
      if (!uploadRes.ok) throw new Error("Video upload failed");
      const { url } = await uploadRes.json();

      // 2. Link video to Borrow record
      const endpoint = type === 'handover' ? `/expansion/borrows/${id}/handover` : `/expansion/borrows/${id}/return`;
      await api.post(endpoint, { video_url: url });
      
      Alert.alert(
        "Verification Successful",
        `Your ${type} has been digitally recorded and secured in the cloud.`,
        [{ text: "Great", onPress: () => router.back() }]
      );
    } catch (e) {
      console.error(e);
      showToast('Verification failed', 'error');
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required for secure handover video verification.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={scale(28)} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{type === 'handover' ? 'Handover' : 'Return'} Verification</Text>
            <View style={{ width: scale(40) }} />
          </View>

          {/* Guide Overlay */}
          <View style={styles.guideContainer}>
            <View style={styles.guideBox}>
               <Text style={styles.guideText}>Record 5 seconds of the tool working to protect your karma points.</Text>
            </View>
          </View>

          {/* Footer Controls */}
          <View style={styles.footer}>
             {isRecording ? (
               <View style={styles.recordingIndicator}>
                  <View style={styles.redDot} />
                  <Text style={styles.countdownText}>REC 00:0{countdown}</Text>
               </View>
             ) : (
               <TouchableOpacity style={styles.recordBtn} onPress={handleStartRecording}>
                  <View style={styles.recordBtnInner} />
               </TouchableOpacity>
             )}
             <Text style={styles.instructionText}>
               {isRecording ? 'Holding steady...' : 'Tap to start 5s verification'}
             </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: verticalScale(50), paddingHorizontal: SPACING.l },
  closeBtn: { width: scale(44), height: scale(44), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },

  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  guideBox: { 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.5)', 
    borderStyle: 'dashed', 
    borderRadius: BORDER_RADIUS.l, 
    padding: SPACING.l,
    width: '100%',
    height: verticalScale(200),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  guideText: { fontSize: normalize(16), fontWeight: '800', color: COLORS.white, textAlign: 'center', opacity: 0.9 },

  footer: { paddingBottom: verticalScale(60), alignItems: 'center' },
  recordBtn: { width: scale(80), height: scale(80), borderRadius: 40, borderWidth: 4, borderColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  recordBtnInner: { width: scale(64), height: scale(64), borderRadius: 32, backgroundColor: COLORS.error },
  
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error, marginRight: 8 },
  countdownText: { color: COLORS.white, fontWeight: '900', fontSize: normalize(16), letterSpacing: 1 },

  instructionText: { color: COLORS.white, fontSize: normalize(14), fontWeight: '700', letterSpacing: 0.5 },

  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.white },
  permissionText: { fontSize: normalize(16), fontWeight: '700', color: COLORS.primary, textAlign: 'center', marginBottom: 24 },
  permissionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BORDER_RADIUS.m },
  permissionBtnText: { color: COLORS.white, fontWeight: '800' }
});
