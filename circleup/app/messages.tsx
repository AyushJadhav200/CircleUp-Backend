import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { Shimmer } from '../components/common/Shimmer';
import { API_URL, getToken } from '../services/api';
import axios from 'axios';

const ChatItem = ({ item, index, onPress }: { item: any, index: number, onPress: () => void }) => (
  <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
    <TouchableOpacity style={styles.chatRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: `https://api.dicebear.com/7.x/lorelei/svg?seed=${item.other_user_name}` }} 
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
        />
        {item.unread && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.userName, item.unread && { fontWeight: '900' }]}>{item.other_user_name}</Text>
          <Text style={styles.timeText}>{new Date(item.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={[styles.lastMsg, item.unread && styles.unreadText]} numberOfLines={1}>
          {item.last_message || 'No messages yet'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
    </TouchableOpacity>
  </Animated.View>
);

const ChatSkeleton = () => (
    <View style={styles.chatRow}>
        <Shimmer width={56} height={56} borderRadius={28} style={{ marginRight: SPACING.m }} />
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Shimmer width="40%" height={16} borderRadius={4} />
                <Shimmer width="15%" height={12} borderRadius={4} />
            </View>
            <Shimmer width="70%" height={14} borderRadius={4} />
        </View>
    </View>
);

export default function MessagesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<any[]>([]);

  const fetchChats = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(res.data);
    } catch (error) {
      console.error('[Messages] Fetch failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
      
      // Connect to WebSocket for real-time list updates
      let ws: WebSocket | null = null;
      let reconnectTimer: any = null;

      const connect = async () => {
          try {
              const meRes = await getToken(); // verifying token
              if (!meRes) return;
              
              // We need current user ID to connect to the right WS channel
              // For simplicity, we can fetch /me once or just wait for messages
              // Actually, its better to just poll or rely on Focus for now if IDs are complex
              // But let's try a robust connection:
              const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${meRes}` }
              });
              const myId = res.data.id;

              const wsProto = API_URL.startsWith('https') ? 'wss' : 'ws';
              const cleanBase = API_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
              const wsUrl = `${wsProto}://${cleanBase}/ws/${myId}`;
              
              ws = new WebSocket(wsUrl);
              ws.onmessage = (e) => {
                  const data = JSON.parse(e.data);
                  if (data.event === 'new_message') {
                      setChats(prev => {
                          const chatIndex = prev.findIndex(c => c.id === data.chat_id);
                          if (chatIndex > -1) {
                              const updatedChats = [...prev];
                              updatedChats[chatIndex] = {
                                  ...updatedChats[chatIndex],
                                  last_message: data.message.content,
                                  last_updated: data.message.timestamp,
                                  unread: true
                              };
                              // Move to top
                              const item = updatedChats.splice(chatIndex, 1)[0];
                              return [item, ...updatedChats];
                          } else {
                              // New conversation not in list yet, refresh
                              fetchChats();
                              return prev;
                          }
                      });
                  }
              };
              ws.onclose = () => {
                  reconnectTimer = setTimeout(connect, 5000);
              };
          } catch (err) {
              console.log('[MessagesWS] Failed:', err);
          }
      };

      connect();

      return () => {
          if (ws) ws.close();
          if (reconnectTimer) clearTimeout(reconnectTimer);
      };
    }, [])
  );

  const renderHeader = () => (
    <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: scale(40) }} />
    </View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} scrollable={false} edgeToEdge={true}>
      <StatusBar style="light" />
      
      {renderHeader()}

      <View style={styles.body}>
        <FlatList
          data={loading ? [{}, {}, {}, {}] : chats}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchChats(true)} tintColor={COLORS.primary} />
          }
          renderItem={({ item, index }) => loading ? (
            <ChatSkeleton />
          ) : (
            <ChatItem 
              item={item} 
              index={index} 
              onPress={() => router.push({
                pathname: '/chat/[id]',
                params: { id: item.id, name: item.other_user_name }
              } as any)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="chat-remove-outline" size={scale(60)} color={COLORS.divider} />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySub}>Messages with neighbors will appear here.</Text>
            </View>
          }
        />
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
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(40),
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  avatarWrapper: { position: 'relative', marginRight: SPACING.m },
  avatar: { width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: COLORS.lightGrey },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: normalize(16), fontWeight: '700', color: COLORS.primary },
  timeText: { fontSize: normalize(12), color: COLORS.grey, fontWeight: '600' },
  lastMsg: { fontSize: normalize(14), color: COLORS.grey, fontWeight: '500' },
  unreadText: { color: COLORS.primary, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: verticalScale(100), paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary, marginTop: SPACING.m },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: SPACING.s },
});
