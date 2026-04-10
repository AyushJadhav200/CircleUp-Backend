import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { api, getToken } from '../../services/api';

export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  
  const fetchMessages = async (userIdOverride?: number) => {
    try {
      const activeUserId = userIdOverride || currentUserId;
      if (!activeUserId) {
        const meRes = await api.post('/auth/me');
        setCurrentUserId(meRes.data.id);
        fetchMessages(meRes.data.id);
        return;
      }
      const res = await api.get(`/chats/${id}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error('[Chat] Fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    
    // Connect to WebSocket
    const wsUrl = `${api.defaults.baseURL?.replace('http', 'ws')}/ws/${currentUserId}`;
    console.log('[Chat] Connecting to WS:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'new_message' && data.chat_id.toString() === id.toString()) {
           setMessages(prev => [...prev, data.message]);
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };
    
    ws.onclose = () => console.log('[Chat] WS Closed');
    ws.onerror = (e) => console.log('[Chat] WS Error:', e);
    
    wsRef.current = ws;
    return () => ws.close();
  }, [currentUserId, id]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [id])
  );

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/chats/${id}/send`, { content: inputText });
      setInputText('');
      fetchMessages();
    } catch (error) {
      console.error('[Chat] Send failed:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <Image 
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` }} 
            style={styles.smallAvatar}
          />
        )}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
            {item.content}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} scrollable={false} edgeToEdge={true}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image 
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` }} 
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSub}>Neighbor</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="call-outline" size={scale(20)} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.body} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(20) : 0}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="chat-outline" size={scale(50)} color={COLORS.divider} />
                <Text style={styles.emptyText}>Start the conversation with {name}!</Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { backgroundColor: COLORS.lightGrey }]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={scale(20)} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingBottom: verticalScale(16),
    backgroundColor: COLORS.primary,
  },
  backBtn: { padding: scale(5), marginRight: SPACING.s },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: scale(40), height: scale(40), borderRadius: 20, marginRight: SPACING.m, backgroundColor: COLORS.lightGrey },
  headerTitle: { fontSize: normalize(16), fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: normalize(12), color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  headerBtn: { padding: scale(8) },
  body: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.m, paddingBottom: verticalScale(20) },
  messageRow: { flexDirection: 'row', marginBottom: verticalScale(16), alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  smallAvatar: { width: scale(28), height: scale(28), borderRadius: 14, marginRight: SPACING.s, backgroundColor: COLORS.lightGrey },
  bubble: { maxWidth: '75%', padding: SPACING.m, borderRadius: BORDER_RADIUS.l },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: COLORS.lightGrey, borderBottomLeftRadius: 4 },
  messageText: { fontSize: normalize(15), lineHeight: 20, fontWeight: '500' },
  myText: { color: COLORS.white },
  otherText: { color: COLORS.primary },
  timeText: { fontSize: normalize(10), color: 'rgba(128,128,128,0.7)', marginTop: 4, alignSelf: 'flex-end' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    paddingBottom: verticalScale(30),
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.l,
    paddingVertical: verticalScale(10),
    marginRight: SPACING.s,
    fontSize: normalize(15),
    maxHeight: verticalScale(100),
  },
  sendBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  emptyState: { alignItems: 'center', marginTop: verticalScale(100) },
  emptyText: { fontSize: normalize(14), color: COLORS.grey, marginTop: SPACING.m, fontWeight: '600' },
});
