import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { api } from '../../services/api';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Shimmer } from '../../components/common/Shimmer';


const ActivityItem = ({ item, index, onRate }: { item: any, index: number, onRate?: (borrowId: number) => void }) => {
  const router = useRouter();
  const isSystem = item.type === 'system';
  
  // Status Color Mapping
  const getStatusStyle = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return { bg: '#E7F9EE', text: '#2ECC71' };
      case 'in progress': return { bg: '#E3F2FD', text: '#2196F3' };
      case 'pending': return { bg: '#FFF3E0', text: '#FF9800' };
      default: return { bg: '#F5F5F5', text: '#757575' };
    }
  };

  const statusStyle = getStatusStyle(item.status);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} style={styles.activityCard}>
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: isSystem ? 'https://api.dicebear.com/7.x/identicon/svg?seed=CircleUp' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}` }} 
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={[styles.typeBadge, { backgroundColor: isSystem ? COLORS.accent : COLORS.primary }]}>
          <Ionicons 
            name={item.type === 'lend' ? 'arrow-up' : (item.type === 'borrow' ? 'arrow-down' : 'sparkles')} 
            size={scale(10)} 
            color={COLORS.white} 
          />
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.userName} numberOfLines={1}>{item.user}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <Text style={styles.activityText} numberOfLines={2}>
          {item.type === 'lend' ? 'Lent out ' : (item.type === 'borrow' ? 'Borrowed ' : '')}
          <Text style={styles.toolName}>{item.tool}</Text>
          {item.type === 'system' ? ' was added to your profile as a contribution bonus.' : ''}
        </Text>
        
        <View style={styles.statusRow}>
           <View style={[styles.statusTag, { backgroundColor: statusStyle.bg }]}>
             <Text style={[styles.statusLabel, { color: statusStyle.text }]}>{item.status.toUpperCase()}</Text>
           </View>

           <View style={styles.actionGroup}>
             {!isSystem && (
                <TouchableOpacity 
                   style={styles.miniActionBtn}
                   onPress={() => router.push('/chat/temp')}
                >
                   <Ionicons name="chatbubble-outline" size={scale(16)} color={COLORS.primary} />
                </TouchableOpacity>
             )}
             
             {item.status === 'In Progress' && (
               <TouchableOpacity 
                 style={styles.actionBtn}
                 onPress={() => {
                   const borrowId = item.id.split('_')[1];
                   const actionType = item.type === 'borrow' ? 'handover' : 'return';
                   router.push({
                     pathname: '/handover',
                     params: { id: borrowId, type: actionType }
                   } as any);
                 }}
               >
                 <Text style={styles.actionBtnText}>
                   {item.type === 'borrow' ? 'Handover' : 'Verify'}
                 </Text>
                 <Ionicons name="camera" size={scale(14)} color={COLORS.white} />
               </TouchableOpacity>
             )}

             {item.status === 'Completed' && item.type === 'borrow' && onRate && (
               <TouchableOpacity 
                 style={styles.rateBtn}
                 onPress={() => onRate(parseInt(item.id.split('_')[1]))}
               >
                 <Ionicons name="star" size={scale(12)} color={COLORS.accent} />
                 <Text style={styles.rateBtnText}>Rate</Text>
               </TouchableOpacity>
             )}
           </View>
        </View>
      </View>
    </Animated.View>
  );
};

const ActivitySkeleton = () => (
  <View style={styles.activityCard}>
    <Shimmer width={56} height={56} borderRadius={28} style={{ marginRight: SPACING.m }} />
    <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Shimmer width="40%" height={16} borderRadius={4} />
            <Shimmer width="15%" height={12} borderRadius={4} />
        </View>
        <Shimmer width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <Shimmer width="20%" height={16} borderRadius={4} />
    </View>
  </View>
);

export default function ActivityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({ tools_lent: 0, karma_earned: 0 });
  const [reviewModal, setReviewModal] = useState<{ visible: boolean; borrowId: number | null }>({ visible: false, borrowId: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchActivity = async () => {
        setLoading(true);
        try {
          const res = await api.get('/tools/activity');
          if (isActive) {
            setActivities(res.data.activities || []);
            setStats(res.data.stats || { tools_lent: 0, karma_earned: 0 });
          }
        } catch (e) {
          if (isActive) setActivities([]);
        } finally {
          if (isActive) setTimeout(() => setLoading(false), 500);
        }
      };
      fetchActivity();
      return () => { isActive = false; };
    }, [])
  );

  const handleSubmitReview = async () => {
    if (!reviewModal.borrowId) return;
    setSubmitting(true);
    try {
      await api.post('/tools/reviews', {
        borrow_id: reviewModal.borrowId,
        rating,
        comment
      });
      setReviewModal({ visible: false, borrowId: null });
      setRating(5);
      setComment('');
    } catch (e: any) {
      // Already reviewed or error
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>Activity Feed</Text>
      <Text style={styles.headerSubtitle}>Total Community Impact</Text>
      
      <View style={styles.impactRow}>
        <View style={[styles.impactCard, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.impactValue}>{stats.tools_lent}</Text>
            <Text style={styles.impactLabel}>TOOLS LENT</Text>
        </View>
        <View style={[styles.impactCard, { backgroundColor: COLORS.accent }]}>
            <Text style={[styles.impactValue, { color: COLORS.primary }]}>{stats.karma_earned}</Text>
            <Text style={[styles.impactLabel, { color: COLORS.primary }]}>KARMA EARNED</Text>
        </View>
      </View>
      
      <Text style={styles.feedHeading}>RECENT UPDATES</Text>
    </View>
  );

  return (
    <AdaptiveScreen style={styles.mainContainer} horizontalPadding={0} scrollable={false} backgroundColor={COLORS.white}>
      <StatusBar style="dark" />
      
      <FlatList
        data={(loading ? [1, 2, 3, 4, 5] : activities) as any[]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => loading ? (
          <ActivitySkeleton />
        ) : (
          <ActivityItem item={item} index={index} onRate={(id) => setReviewModal({ visible: true, borrowId: id })} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="history" size={scale(60)} color={COLORS.divider} />
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySub}>Start sharing or borrowing to build your impact!</Text>
            </View>
        }
      />

        {/* REVIEW MODAL */}
        <Modal
          visible={reviewModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setReviewModal({ visible: false, borrowId: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Rate This Rental</Text>
              <Text style={styles.modalSub}>How was your experience?</Text>

              {/* Stars */}
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={scale(34)}
                      color={star <= rating ? '#FFB800' : COLORS.divider}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment */}
              <TextInput
                style={styles.reviewInput}
                placeholder="Leave a comment (optional)"
                placeholderTextColor={COLORS.grey}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn}
                  onPress={() => setReviewModal({ visible: false, borrowId: null })}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmitReview}
                  disabled={submitting}
                >
                  <Text style={styles.modalSubmitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  listContainer: { paddingBottom: verticalScale(40) },
  headerContent: { paddingHorizontal: SPACING.l, paddingTop: verticalScale(20), marginBottom: verticalScale(10) },
  headerTitle: { fontSize: normalize(32), fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  headerSubtitle: { fontSize: normalize(15), color: COLORS.grey, fontWeight: '600', marginBottom: verticalScale(20) },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(32) },
  impactCard: { flex: 0.48, borderRadius: BORDER_RADIUS.l, padding: SPACING.m, ...SHADOWS.medium },
  impactValue: { fontSize: normalize(28), fontWeight: '900', color: COLORS.white },
  impactLabel: { fontSize: normalize(9), fontWeight: '900', color: COLORS.white, opacity: 0.8, letterSpacing: 1 },
  feedHeading: { fontSize: normalize(11), fontWeight: '900', color: COLORS.grey, letterSpacing: 2, marginBottom: verticalScale(16) },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(18),
    paddingHorizontal: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  avatarWrapper: { position: 'relative', marginRight: SPACING.m },
  avatar: { width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: COLORS.lightGrey },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary, flex: 1, marginRight: 8 },
  timeText: { fontSize: normalize(12), color: COLORS.grey, fontWeight: '500' },
  activityText: { fontSize: normalize(14), color: COLORS.grey, fontWeight: '500', lineHeight: 20 },
  toolName: { color: COLORS.primary, fontWeight: '800' },
  statusLabel: { fontSize: normalize(10), fontWeight: '900', letterSpacing: 0.5 },
  statusTag: { 
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 4, 
      alignSelf: 'flex-start',
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 10 
  },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniActionBtn: { 
    width: scale(32), 
    height: scale(32), 
    borderRadius: 8, 
    backgroundColor: '#F0F3F7', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    gap: 6
  },
  actionBtnText: { fontSize: normalize(11), fontWeight: '800', color: COLORS.white },
  emptyState: { alignItems: 'center', marginTop: verticalScale(60), paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary, marginTop: SPACING.m },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: SPACING.s },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E7', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#FFB800',
  },
  rateBtnText: { fontSize: normalize(11), fontWeight: '800', color: '#B8860B' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.l, paddingBottom: verticalScale(40),
  },
  modalTitle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary, textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginBottom: SPACING.l },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: SPACING.l },
  reviewInput: {
    backgroundColor: '#F8F9FA', borderRadius: BORDER_RADIUS.m, padding: SPACING.m,
    fontSize: normalize(14), color: COLORS.primary, fontWeight: '600',
    borderWidth: 1, borderColor: '#F0F0F0', minHeight: verticalScale(80),
    textAlignVertical: 'top', marginBottom: SPACING.l,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, height: verticalScale(52), borderRadius: BORDER_RADIUS.m,
    backgroundColor: COLORS.lightGrey, justifyContent: 'center', alignItems: 'center',
  },
  modalCancelText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.grey },
  modalSubmitBtn: {
    flex: 2, height: verticalScale(52), borderRadius: BORDER_RADIUS.m,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalSubmitText: { fontSize: normalize(14), fontWeight: '900', color: COLORS.white },
});
