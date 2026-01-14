/**
 * Category Circle Component
 * Circular category image or emoji with label
 * Supports both image URLs and emoji icons from backend config
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const CategoryCircle = ({ name, image, emoji, bgColor, onPress }) => {
  const hasImage = image && !emoji;
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[
        styles.imageContainer,
        { backgroundColor: bgColor || '#f5f5f5' }
      ]}>
        {hasImage ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{emoji || '📁'}</Text>
        )}
      </View>
      <Text style={styles.name}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 32,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CategoryCircle;
