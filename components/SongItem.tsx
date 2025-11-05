import React from 'react';
import { View, Text, StyleSheet, Pressable, GestureResponderEvent, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Music, Clock, GripVertical, Play } from 'lucide-react-native';
import { Song } from '@/types';
import { formatDuration } from '@/utils/timeUtils';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';

interface SongItemProps {
  song: Song;
  onPress?: () => void;
  isDraggable?: boolean;
  hidePlayButton?: boolean;
  dragHandleProps?: any;
}

export default function SongItem({ 
  song, 
  onPress, 
  isDraggable = false,
  hidePlayButton = false,
  dragHandleProps
}: SongItemProps) {
  const router = useRouter();
  const { setCurrentSong, currentSongId } = usePlayerStore();
  const { colors } = useTheme();
  
  const isCurrentSong = currentSongId === song.id;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/songs/${song.id}`);
    }
  };
  
  const handlePlay = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onPress
    
    console.log('Play button pressed for song:', song.title, 'Has audio:', !!song.audioUri);
    
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Audio playback is not available on web.");
      return;
    }
    
    if (!song.audioUri) {
      Alert.alert("No Audio", `"${song.title}" doesn't have an audio file attached. Add an audio file in the song editor to enable playback.`);
      return;
    }
    
    setCurrentSong(song.id, true); // Pass true to auto-play
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.surfaceVariant : colors.surface }
      ]}
      onPress={handlePress}
    >
      {isDraggable && (
        <View {...dragHandleProps} style={styles.dragHandle}>
          <GripVertical size={20} color={colors.textSecondary} />
        </View>
      )}
      
      <View style={styles.iconContainer}>
        <Music size={24} color={isCurrentSong ? colors.primary : colors.textSecondary} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{song.title}</Text>
        <Text style={[styles.artist, { color: colors.textSecondary }]}>{song.artist}</Text>
        
        <View style={styles.details}>
          <Text style={[styles.key, { color: colors.textSecondary }]}>
            Key: {song.key}
          </Text>
          <View style={styles.durationContainer}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.duration, { color: colors.textSecondary }]}>
              {formatDuration(song.duration)}
            </Text>
          </View>
        </View>
      </View>
      
      {!hidePlayButton && (
        <Pressable 
          style={[
            styles.playButton, 
            { backgroundColor: colors.secondary }
          ]}
          onPress={handlePlay}
        >
          <Play 
            size={20} 
            color="#ffffff" 
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  dragHandle: {
    paddingRight: 8,
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
  artist: {
    fontSize: 14,
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    fontSize: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    marginLeft: 4,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});