import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GripVertical, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import { Song } from '@/types';

interface DraggableSongItemProps {
  song: Song;
  index: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (songId: string) => void;
  itemHeight: number;
  totalItems: number;
}

export default function DraggableSongItem({
  song,
  index,
  onMove,
  onRemove,
  itemHeight,
  totalItems,
}: DraggableSongItemProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const offsetY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      // Calculate which position we're over when released
      const newPosition = index + Math.round(translateY.value / itemHeight);
      const clampedPosition = Math.max(0, Math.min(totalItems - 1, newPosition));

      // Trigger the move if we're in a different position
      if (clampedPosition !== index) {
        runOnJS(onMove)(index, clampedPosition);
      }

      translateY.value = withSpring(0);
      offsetY.value = 0;
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      zIndex: isDragging.value ? 1000 : 1,
      elevation: isDragging.value ? 10 : 1,
      opacity: isDragging.value ? 0.9 : 1,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: isDragging.value ? 4 : 0,
      },
      shadowOpacity: isDragging.value ? 0.3 : 0,
      shadowRadius: isDragging.value ? 4 : 0,
    };
  });

  // For web compatibility, use a simpler version without animations
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <GripVertical size={20} color={colors.dark.textSecondary} />
        </View>

        <View style={styles.songContent}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
          <Text style={styles.duration}>
            {`${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`}
          </Text>
        </View>

        <Pressable
          style={styles.removeButton}
          onPress={() => onRemove(song.id)}
        >
          <Trash2 size={20} color={colors.dark.error} />
        </Pressable>
      </View>
    );
  }

  // Mobile version with drag and drop
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.dragHandle}>
          <GripVertical size={20} color={colors.dark.textSecondary} />
        </View>

        <View style={styles.songContent}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
          <Text style={styles.duration}>
            {`${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`}
          </Text>
        </View>

        <Pressable
          style={styles.removeButton}
          onPress={() => onRemove(song.id)}
        >
          <Trash2 size={20} color={colors.dark.error} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dragHandle: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  songContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: colors.dark.textSecondary,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
});