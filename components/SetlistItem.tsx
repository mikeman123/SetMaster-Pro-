import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ListMusic, Play, Clock } from 'lucide-react-native';
import { Setlist } from '@/types';
import { formatDuration } from '@/utils/timeUtils';
import { useTheme } from '@/context/ThemeContext';

interface SetlistItemProps {
  setlist: Setlist;
  onPress: () => void;
  onPlayPress?: () => void;
  showPlayButton?: boolean;
}

export default function SetlistItem({ 
  setlist, 
  onPress, 
  onPlayPress,
  showPlayButton = false 
}: SetlistItemProps) {
  const { colors } = useTheme();
  
  const handlePlayPress = (e: any) => {
    e.stopPropagation();
    if (onPlayPress) {
      onPlayPress();
    }
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <ListMusic size={24} color={colors.primary} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {setlist.name}
        </Text>
        
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Clock size={14} color={colors.textSecondary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {formatDuration(setlist.duration)}
            </Text>
          </View>
        </View>
      </View>
      
      {showPlayButton && (
        <Pressable 
          style={[styles.playButton, { backgroundColor: colors.secondary }]}
          onPress={handlePlayPress}
        >
          <Play size={16} color="#fff" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});