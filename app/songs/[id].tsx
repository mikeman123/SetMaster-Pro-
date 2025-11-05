import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Edit, Trash2, MoreVertical, ListRestart, Music, Clock, ChevronLeft } from 'lucide-react-native';
import { useSongStore } from '@/store/songStore';
import { usePlayerStore } from '@/store/playerStore';
import LyricsDisplay from '@/components/LyricsDisplay';
import { formatDuration } from '@/utils/timeUtils';
import { useTheme } from '@/context/ThemeContext';

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { songs, deleteSong } = useSongStore();
  const { setCurrentSong, unloadAudio } = usePlayerStore();
  const [showOptions, setShowOptions] = useState(false);
  const { colors } = useTheme();
  
  const song = songs[id];
  
  useEffect(() => {
    // Cleanup when unmounting
    return () => {
      // This will be called when navigating away from this screen
    };
  }, []);
  
  if (!song) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Song not found</Text>
      </View>
    );
  }
  
  const handlePlay = () => {
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
  
  const handlePractice = async () => {
    // First unload any current audio to prevent duplication
    await unloadAudio();
    
    // Navigate to practice mode
    router.push(`/practice/${song.id}?isSong=true`);
  };
  
  const handleEdit = () => {
    router.push(`/songs/edit/${song.id}`);
    setShowOptions(false);
  };
  
  const handleDelete = () => {
    Alert.alert(
      "Delete Song",
      `Are you sure you want to delete "${song.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            deleteSong(song.id);
            router.back();
          },
          style: "destructive"
        }
      ]
    );
    setShowOptions(false);
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>{song.title}</Text>
          <Text style={[styles.artist, { color: colors.textSecondary }]}>{song.artist}</Text>
          
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Key</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{song.key}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tempo</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{song.tempo} BPM</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDuration(song.duration)}</Text>
            </View>
          </View>
        </View>
        
        <Pressable 
          style={styles.optionsButton}
          onPress={() => setShowOptions(!showOptions)}
        >
          <MoreVertical size={24} color={colors.text} />
        </Pressable>
        
        {showOptions && (
          <View style={[styles.optionsMenu, { backgroundColor: colors.surface }]}>
            <Pressable style={styles.optionItem} onPress={handleEdit}>
              <Edit size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Edit</Text>
            </Pressable>
            <Pressable style={styles.optionItem} onPress={handleDelete}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
      
      {song.audioUri && Platform.OS !== 'web' && (
        <View style={[styles.audioInfo, { backgroundColor: colors.surface }]}>
          <View style={styles.audioFileInfo}>
            <Music size={20} color={colors.primary} />
            <Text style={[styles.audioFileName, { color: colors.text }]} numberOfLines={1}>
              {song.audioFileName || "Audio file"}
            </Text>
          </View>
        </View>
      )}
      
      {song.lyricsStartTime !== undefined && song.lyricsStartTime > 0 && (
        <View style={[styles.lyricsStartTimeInfo, { backgroundColor: colors.surface }]}>
          <View style={styles.lyricsStartTimeContainer}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.lyricsStartTimeText, { color: colors.text }]}>
              Lyrics start at {formatDuration(song.lyricsStartTime || 0)} into the song
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handlePlay}
        >
          <Play size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Play</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={handlePractice}
        >
          <ListRestart size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Practice</Text>
        </Pressable>
      </View>
      
      <View style={styles.lyricsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lyrics & Chords</Text>
        
        {song.lyrics ? (
          <LyricsDisplay lyrics={song.lyrics} chords={song.chords} />
        ) : (
          <View style={styles.emptyLyrics}>
            <Text style={[styles.emptyLyricsText, { color: colors.textSecondary }]}>
              No lyrics added yet. Edit the song to add lyrics.
            </Text>
            <Pressable 
              style={[styles.emptyButton, { backgroundColor: colors.surface }]}
              onPress={handleEdit}
            >
              <Text style={[styles.emptyButtonText, { color: colors.primary }]}>
                Edit Song
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      
      {song.notes && (
        <View style={styles.notesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
          <ScrollView style={[styles.notesScrollView, { backgroundColor: colors.surface }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>{song.notes}</Text>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginTop: -4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artist: {
    fontSize: 18,
    marginBottom: 16,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 50,
    right: 20,
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
  },
  audioInfo: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  audioFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioFileName: {
    fontSize: 14,
  },
  lyricsStartTimeInfo: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  lyricsStartTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lyricsStartTimeText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  lyricsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyLyrics: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyLyricsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    padding: 20,
    paddingTop: 0,
    maxHeight: 200,
  },
  notesScrollView: {
    borderRadius: 8,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});