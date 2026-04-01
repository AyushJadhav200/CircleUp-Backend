import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { scale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { useCart } from '../../components/common/CartProvider';
import { useToast } from '../../components/common/ToastProvider';

interface ProductCardProps {
  item: any;
  onPress: () => void;
}

export function ProductCard({ item, onPress }: ProductCardProps) {
  const { width } = useWindowDimensions();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const cardWidth = (width - SPACING.l * 3) / 2;

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    addToCart(item, 'product');
    showToast(`${item.name} added to cart!`, 'success');
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { width: cardWidth }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        <Image 
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1542496658-e3268940d540?q=80&w=400' }} 
          style={styles.cardImage}
          contentFit="cover"
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        
        <View style={styles.footer}>
          <Text style={styles.price}>₹{item.price}</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={handleAddToCart}>
            <Ionicons name="add" size={scale(18)} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.s,
    marginBottom: SPACING.m,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageWrapper: {
    width: '100%',
    height: scale(140),
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.s,
  },
  categoryText: {
    fontSize: normalize(8),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  info: {
    padding: SPACING.s,
  },
  name: {
    fontSize: normalize(14),
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
    height: normalize(36),
    lineHeight: normalize(18),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: normalize(16),
    fontWeight: '900',
    color: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
});
