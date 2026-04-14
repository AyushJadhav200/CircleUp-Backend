import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { api } from '../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { useToast } from '../components/common/ToastProvider';

export default function VerifyIdentityScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleUpload = async () => {
        if (!image) return;
        setUploading(true);
        try {
            const formData = new FormData();
            const uriParts = image.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('file', {
                uri: image,
                name: `id_doc.${fileType}`,
                type: `image/${fileType}`,
            } as any);

            await api.post('/auth/me/verify-id', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            showToast('Identity submitted for review!', 'success');
            router.back();
        } catch (error: any) {
            console.error('[VerifyID] Upload failed:', error);
            const serverMsg = error?.response?.data?.detail;
            if (serverMsg && serverMsg.includes('Invalid Document')) {
                // AI rejected the photo — show clear alert
                Alert.alert(
                    '❌ Not a Valid ID',
                    serverMsg,
                    [{ text: 'Retake Photo', onPress: pickImage }]
                );
            } else {
                showToast(serverMsg || 'Failed to upload document. Please try again.', 'error');
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdaptiveScreen backgroundColor={COLORS.white}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.container}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                <Text style={styles.title}>Verify Identity</Text>
                <Text style={styles.subtitle}>
                    Upload a clear photo of your Aadhaar Card, Driving License, or Voter ID. This is required only for high-value tool rentals.
                </Text>

                <View style={styles.previewContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.preview} contentFit="contain" />
                    ) : (
                        <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage}>
                            <Ionicons name="camera-outline" size={48} color={COLORS.grey} />
                            <Text style={styles.placeholderText}>Click to Capture ID</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.guidelines}>
                    <Text style={styles.guideTitle}>Guidelines:</Text>
                    <View style={styles.guideItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.guideText}>Ensure the text on the ID is clearly readable.</Text>
                    </View>
                    <View style={styles.guideItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.guideText}>The photo should not be blurry or over-exposed.</Text>
                    </View>
                    <View style={styles.guideItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.guideText}>Your data is stored securely and never shared.</Text>
                    </View>
                </View>

                {image ? (
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={styles.retakeBtn} 
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            <Text style={styles.retakeText}>Retake Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.submitBtn} 
                            onPress={handleUpload}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Submit for Review</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : null}
            </ScrollView>
        </AdaptiveScreen>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l, paddingTop: verticalScale(40) },
    backBtn: { marginBottom: SPACING.l },
    title: { fontSize: normalize(28), fontWeight: '900', color: COLORS.primary, marginBottom: 8 },
    subtitle: { fontSize: normalize(15), color: COLORS.grey, lineHeight: 22, marginBottom: verticalScale(30) },
    previewContainer: {
        width: '100%',
        height: verticalScale(240),
        backgroundColor: COLORS.lightGrey,
        borderRadius: BORDER_RADIUS.m,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
        marginBottom: verticalScale(30),
    },
    uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { marginTop: 12, fontSize: normalize(16), fontWeight: 'bold', color: COLORS.grey },
    preview: { flex: 1 },
    guidelines: { marginBottom: verticalScale(40), backgroundColor: '#F8F9FA', padding: SPACING.m, borderRadius: BORDER_RADIUS.m },
    guideTitle: { fontSize: normalize(14), fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },
    guideItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    guideText: { fontSize: normalize(13), color: COLORS.grey },
    actions: { gap: 12 },
    submitBtn: {
        height: verticalScale(56),
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.soft,
    },
    submitText: { fontSize: normalize(16), fontWeight: 'bold', color: '#fff' },
    retakeBtn: {
        height: verticalScale(50),
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retakeText: { fontSize: normalize(14), fontWeight: 'bold', color: COLORS.primary },
});
