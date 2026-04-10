import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { api, API_URL, TOKEN_KEY } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

const CATEGORIES = ['Power Tools', 'Hand Tools', 'Gardening', 'Cleaning', 'Automotive', 'Painting', 'Electronics', 'Others'];

export default function LendToolScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Power Tools');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);

  const handleTakePhoto = async () => {
    if (images.length >= 6) {
      showToast('Maximum 6 photos allowed', 'error');
      return;
    }
    setIsOptionsVisible(true);
  };

  const openCamera = async () => {
    setIsOptionsVisible(false);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        showToast('Camera permission required', 'error');
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const pickImageFromGallery = async () => {
    setIsOptionsVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const newUri = result.assets[0].uri;
        setImages([...images, newUri]);
        showToast(`Image added from gallery!`, 'success');
      }
    } catch (e) {
      console.error('Gallery pick failed', e);
      showToast('Failed to pick image', 'error');
    }
  };

  const captureImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          if (images.length >= 6) {
            showToast('Maximum 6 photos allowed', 'error');
            setIsCameraOpen(false);
            return;
          }
          setImages([...images, photo.uri]);
          showToast(`Photo ${images.length + 1} captured!`, 'success');
        }
      } catch (e) {
        console.error('Failed to take photo', e);
      }
    }
  };

  const handleSubmit = async () => {
    const safeName = name.trim();
    const safeDesc = description.trim();
    const parsedPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    const parsedSalePrice = salePrice ? parseFloat(salePrice.replace(/[^0-9.]/g, '')) : undefined;

    if (!safeName || isNaN(parsedPrice)) {
      showToast('Please enter a tool name and daily rate', 'error');
      return;
    }

    setLoading(true);
    try {
      const finalImageUrls: string[] = [];

      // 1. Upload all local images to S3
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      
      const uploadPromises = images.map(async (imgUri) => {
        if (imgUri.startsWith('file://')) {
          const formData = new FormData();
          const filename = imgUri.split('/').pop() || 'photo.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          formData.append('file', {
            uri: imgUri,
            name: filename,
            type,
          } as any);

          const uploadRes = await fetch(`${API_URL}/tools/upload`, {
            method: 'POST',
            body: formData as any,
            headers: {
               'Authorization': `Bearer ${token}`
            }
          });
          
          if (!uploadRes.ok) throw new Error("Upload failed");
          const uploadData = await uploadRes.json();
          return uploadData.url;
        }
        return imgUri;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      finalImageUrls.push(...uploadedUrls);

      // 2. Prepare tool data with real location (fallback to Noida coordinates if unavailable)
      const userRes = await api.post('/auth/me');
      const userData = userRes.data;

      const toolData = {
        name: safeName,
        description: safeDesc, 
        category,
        price_per_day: parsedPrice,
        sale_price: parsedSalePrice,
        image_url: finalImageUrls[0] || null, // First one is primary
        images: finalImageUrls,
        latitude: userData.latitude || 28.5355, 
        longitude: userData.longitude || 77.3910,
        is_verified: true,
        is_preowned: true,
      };

      await api.post('/tools/', toolData);
      showToast('Tool listed successfully! 🎉', 'success');
      router.replace('/(tabs)/vault' as any);
    } catch (e) {
      showToast('Failed to list tool', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAIInfo = async () => {
    if (images.length === 0) {
      showToast('Take a photo first for AI analysis', 'info');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/expansion/ai/describe-tool', { image_url: images[0] });
      const data = res.data;
      setName(data.name);
      setCategory(data.category);
      setDescription(data.description);
      showToast('AI Magic applied! ✨', 'success');
    } catch (e) {
      showToast('AI analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isCameraOpen) {
    const CustomCameraView = CameraView as any;
    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" />
        <CustomCameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
        <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame} />
            <Text style={styles.cameraGuide}>Center the tool in the frame</Text>
        </View>
        
        {/* Safe Area Camera Controls */}
        <View style={[styles.cameraHeader, { paddingTop: insets.top + SPACING.s }]}>
            <TouchableOpacity style={styles.closeCameraButton} onPress={() => setIsCameraOpen(false)}>
                <Ionicons name="close" size={scale(30)} color="white" />
            </TouchableOpacity>
        </View>

        <View style={[styles.cameraFooter, { paddingBottom: insets.bottom + SPACING.l }]}>
          <TouchableOpacity 
            style={styles.doneBtn} 
            onPress={() => setIsCameraOpen(false)}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={captureImage}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <View style={{ width: scale(80) }} /> 
        </View>
      </View>
    );
  }

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} edgeToEdge={true} scrollable={false}>
      <Modal
        visible={isOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsOptionsVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <TouchableOpacity style={styles.optionBtn} onPress={openCamera}>
              <View style={[styles.optionIcon, { backgroundColor: '#EBF4FF' }]}>
                <Ionicons name="camera" size={scale(24)} color={COLORS.primary} />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionBtn} onPress={pickImageFromGallery}>
              <View style={[styles.optionIcon, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="images" size={scale(24)} color={COLORS.accent} />
              </View>
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setIsOptionsVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <StatusBar style="light" />
      
      <View style={[styles.header, { paddingTop: insets.top + verticalScale(15) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lend a Tool</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView 
        style={styles.body} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(20) }}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.sectionTitle}>PHOTO GALLERY (Max 6)</Text>
            
            <View style={styles.photoListContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
                    {images.map((img, idx) => (
                        <View key={idx} style={styles.thumbnailContainer}>
                            <Image source={{ uri: img }} style={styles.thumbnail} />
                            <TouchableOpacity 
                                style={styles.removeImageBtn}
                                onPress={() => setImages(images.filter((_, i) => i !== idx))}
                            >
                                <Ionicons name="close-circle" size={scale(24)} color={COLORS.accent} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {images.length < 6 && (
                        <TouchableOpacity style={styles.addMoreBtn} onPress={handleTakePhoto}>
                            <Ionicons name="add" size={scale(32)} color={COLORS.primary} />
                            <Text style={styles.addMoreText}>Add</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Category</Text>
                <View style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity 
                    key={cat}
                    style={[styles.catPill, category === cat && styles.activeCatPill]}
                    onPress={() => setCategory(cat)}
                    >
                    <Text style={[styles.catPillText, category === cat && styles.activeCatPillText]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>Specifications</Text>
                    <TouchableOpacity style={styles.aiBtn} onPress={handleAIInfo} disabled={loading}>
                        <MaterialCommunityIcons name="auto-fix" size={scale(16)} color={COLORS.primary} />
                        <Text style={styles.aiBtnText}>AI MAGIC</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.inputSubGroup}>
                    <Text style={styles.inputSubLabel}>Tool Name</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g. DeWalt Industrial Hammer Drill"
                        placeholderTextColor={COLORS.grey}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputSubGroup}>
                    <Text style={styles.inputSubLabel}>Description</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        placeholder="Tell others about your tool's condition..."
                        placeholderTextColor={COLORS.grey}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                <Text style={styles.label}>Daily Rate</Text>
                <Text style={styles.required}>REQUIRED</Text>
                </View>
                <View style={styles.priceInputWrapper}>
                <Text style={styles.currency}>₹</Text>
                <TextInput 
                    style={styles.priceInput}
                    placeholder="15.00"
                    placeholderTextColor={COLORS.grey}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                <Text style={styles.label}>Sale Price (Optional)</Text>
                <Text style={[styles.required, { color: COLORS.grey }]}>OPTIONAL</Text>
                </View>
                <View style={styles.priceInputWrapper}>
                <Text style={styles.currency}>₹</Text>
                <TextInput 
                    style={styles.priceInput}
                    placeholder="e.g. 1500.00 (Leave blank if rent only)"
                    placeholderTextColor={COLORS.grey}
                    keyboardType="numeric"
                    value={salePrice}
                    onChangeText={setSalePrice}
                />
                </View>
            </View>

            <View style={{ height: verticalScale(10) }} />
        </Animated.View>
      </ScrollView>

      {/* Sticky Footer Submit Button */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + verticalScale(10) }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!name || !price) && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={loading || !name || !price}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>List Tool</Text>
              <MaterialCommunityIcons name="rocket-launch" size={scale(20)} color={COLORS.primary} style={{ marginLeft: scale(8) }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingBottom: verticalScale(20),
    backgroundColor: COLORS.primary,
  },
  backBtn: { padding: scale(5) },
  headerTitle: { fontSize: normalize(20), fontWeight: '900', color: COLORS.white },
  body: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(30),
  },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 1.5, marginBottom: verticalScale(16) },
  photoListContainer: { marginBottom: verticalScale(25), height: verticalScale(120) },
  photoList: { paddingRight: SPACING.l },
  thumbnailContainer: { width: scale(100), height: '100%', marginRight: SPACING.m, borderRadius: BORDER_RADIUS.m, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, zIndex: 10, backgroundColor: 'white', borderRadius: 12 },
  addMoreBtn: { width: scale(100), height: '100%', borderRadius: BORDER_RADIUS.m, backgroundColor: COLORS.lightGrey, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.divider },
  addMoreText: { fontSize: normalize(12), fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  previewImage: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  iconCircle: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(32),
      backgroundColor: COLORS.white,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      ...SHADOWS.soft,
  },
  photoText: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary },
  inputGroup: { marginBottom: verticalScale(24) },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary },
  required: { fontSize: normalize(9), fontWeight: '900', color: COLORS.accent, letterSpacing: 1 },
  input: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(54),
    fontSize: normalize(15),
    fontWeight: '600',
    color: COLORS.primary,
  },
  priceInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.lightGrey,
      borderRadius: BORDER_RADIUS.m,
      paddingHorizontal: SPACING.m,
      height: verticalScale(54),
  },
  currency: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary, marginRight: 8 },
  priceInput: { flex: 1, fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  textArea: { height: verticalScale(100), paddingTop: verticalScale(15), textAlignVertical: 'top' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4, ...SHADOWS.soft },
  aiBtnText: { fontSize: normalize(10), fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5 },
  inputSubGroup: { marginTop: 16 },
  inputSubLabel: { fontSize: normalize(12), fontWeight: '700', color: COLORS.grey, marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  catPill: {
    paddingHorizontal: SPACING.m,
    paddingVertical: verticalScale(10),
    borderRadius: BORDER_RADIUS.xl,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: COLORS.lightGrey,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  activeCatPill: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catPillText: { fontSize: normalize(13), fontWeight: '700', color: COLORS.primary },
  activeCatPillText: { color: COLORS.white },
  submitBtn: {
    backgroundColor: COLORS.accent,
    height: verticalScale(60),
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accent,
  },
  submitBtnText: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  stickyFooter: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(12),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  submitBtnDisabled: { opacity: 0.5 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  cameraFrame: { 
      width: scale(280), 
      height: scale(280), 
      borderWidth: 2, 
      borderColor: COLORS.accent, 
      borderRadius: BORDER_RADIUS.l,
      borderStyle: 'dashed'
  },
  cameraGuide: { color: 'white', marginTop: 20, fontSize: normalize(14), fontWeight: '700', textShadowColor: 'black', textShadowRadius: 4 },
  cameraHeader: { position: 'absolute', top: 0, left: SPACING.l, zIndex: 10 },
  cameraFooter: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    zIndex: 10 
  },
  doneBtn: { 
    backgroundColor: COLORS.accent, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: BORDER_RADIUS.m,
    ...SHADOWS.soft 
  },
  doneBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: normalize(14) },
  captureBtn: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'white',
  },
  closeCameraButton: { padding: scale(5) },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl * 2 : SPACING.xl,
  },
  modalTitle: {
    fontSize: normalize(18),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    marginBottom: SPACING.m,
  },
  optionIcon: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  optionText: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: COLORS.primary,
  },
  cancelBtn: {
    marginTop: SPACING.s,
    paddingVertical: SPACING.m,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.grey,
  },
});
