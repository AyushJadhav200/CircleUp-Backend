import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInRight, SlideInUp } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { api } from '../services/api';
import { useToast } from '../components/common/ToastProvider';

export default function CirclesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showToast } = useToast();
  const [circles, setCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: Circle Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCircles = async () => {
    try {
      const res = await api.get('/expansion/circles');
      setCircles(res.data);
    } catch (e) {
      console.error('Failed to fetch circles', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircles();
  }, []);

  const handleJoin = async (id: number, name: string) => {
    try {
      await api.post(`/expansion/circles/${id}/join`);
      showToast(`Welcome to ${name}!`, 'success');
      fetchCircles();
    } catch (e) {
      showToast('Could not join circle', 'error');
    }
  };

  const handleCreateCircle = async () => {
    if (!newName.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post('/expansion/circles', {
        name: newName,
        description: newDesc,
        radius: 1000 // 1km default
      });
      showToast('Circle created! 🌍', 'success');
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      fetchCircles();
    } catch (e) {
      showToast('Failed to create circle', 'error');
    } finally {
      setCreating(false);
    }
  };

  const renderCircleItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 100)} 
      style={styles.circleCard}
    >
      <Image 
        source={{ uri: item.image_url || `https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&seed=${item.id}` }} 
        style={styles.circleImg}
        cachePolicy="disk"
        transition={200}
      />
      <View style={styles.circleInfo}>
        <Text style={styles.circleName}>{item.name}</Text>
        <Text style={styles.circleDesc} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.circleMeta}>
          <View style={styles.memberBadge}>
            <Ionicons name="people" size={scale(14)} color={COLORS.primary} />
            <Text style={styles.memberCount}>{item.member_count} Members</Text>
          </View>
          <View style={styles.dot} />
          <Text style={styles.radiusText}>{item.radius}m radius</Text>
        </View>

        <TouchableOpacity 
          style={styles.joinBtn} 
          onPress={() => handleJoin(item.id, item.name)}
        >
          <Text style={styles.joinBtnText}>Join Circle</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} scrollable={false} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust Circles</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
         <View style={styles.searchBox}>
            <Ionicons name="search" size={scale(18)} color={COLORS.grey} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Find your community circle..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
         </View>
      </View>

      <FlatList
        data={circles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCircleItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={scale(64)} color={COLORS.divider} />
            <Text style={styles.emptyText}>{loading ? 'Loading circles...' : 'No circles found nearby'}</Text>
          </View>
        }
      />

      {/* CREATE CIRCLE MODAL */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { width: width * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Trust Circle</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={scale(24)} color={COLORS.grey} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CIRCLE NAME</Text>
                <TextInput 
                  style={styles.textInput}
                  placeholder="e.g., Riverside DIYers"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION</Text>
                <TextInput 
                  style={[styles.textInput, { height: verticalScale(100), textAlignVertical: 'top' }]}
                  placeholder="Tell neighbors what this circle is for..."
                  multiline
                  numberOfLines={4}
                  value={newDesc}
                  onChangeText={setNewDesc}
                />
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="location-outline" size={scale(16)} color={COLORS.primary} />
                <Text style={styles.infoText}>The circle will be centered at your current neighborhood location.</Text>
              </View>

              <TouchableOpacity 
                style={[styles.modalSubmitBtn, creating && { opacity: 0.7 }]}
                onPress={handleCreateCircle}
                disabled={creating}
              >
                {creating ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>CREATE CIRCLE</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: verticalScale(20),
    marginBottom: SPACING.m 
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: 20, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },
  headerTitle: { fontSize: normalize(24), fontWeight: '900', color: COLORS.primary },
  createBtn: { width: scale(40), height: scale(40), borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },

  searchContainer: { paddingHorizontal: SPACING.l, marginBottom: SPACING.m },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    borderRadius: BORDER_RADIUS.m, 
    paddingHorizontal: SPACING.m, 
    height: verticalScale(50), 
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  searchInput: { flex: 1, marginLeft: SPACING.s, fontSize: normalize(15), fontWeight: '600', color: COLORS.primary },

  listContent: { paddingHorizontal: SPACING.l, paddingBottom: verticalScale(40) },
  circleCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: BORDER_RADIUS.l, 
    marginBottom: SPACING.m, 
    overflow: 'hidden', 
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  circleImg: { width: '100%', height: verticalScale(140) },
  circleInfo: { padding: SPACING.m },
  circleName: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  circleDesc: { fontSize: normalize(13), fontWeight: '600', color: COLORS.grey, lineHeight: 18, marginBottom: 12 },
  circleMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGrey, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  memberCount: { fontSize: normalize(11), fontWeight: '800', color: COLORS.primary, marginLeft: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.divider, marginHorizontal: 10 },
  radiusText: { fontSize: normalize(11), fontWeight: '700', color: COLORS.grey },
  
  joinBtn: { height: verticalScale(44), backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.m, justifyContent: 'center', alignItems: 'center' },
  joinBtnText: { fontSize: normalize(14), fontWeight: '800', color: COLORS.white },

  emptyContainer: { alignItems: 'center', marginTop: verticalScale(80) },
  emptyText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.grey, marginTop: 16 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.l,
    paddingBottom: verticalScale(40),
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  modalTitle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary },
  inputGroup: { marginBottom: SPACING.m },
  inputLabel: { fontSize: normalize(10), fontWeight: '900', color: COLORS.grey, letterSpacing: 1.5, marginBottom: 8 },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    fontSize: normalize(15),
    fontWeight: '600',
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: verticalScale(50),
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    padding: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    marginBottom: SPACING.l,
    gap: 8,
  },
  infoText: { fontSize: normalize(12), fontWeight: '600', color: COLORS.primary, flex: 1 },
  modalSubmitBtn: {
    height: verticalScale(56),
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.l,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalSubmitText: { fontSize: normalize(15), fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
});
