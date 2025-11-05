import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Edit, Trash2, MoreVertical, ListRestart, Share2, ChevronLeft } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { usePlayerStore } from '@/store/playerStore';
import SongItem from '@/components/SongItem';
import { formatDuration } from '@/utils/timeUtils';
import { FlatList } from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeContext';
import { shareSetlist } from '@/utils/shareUtils';

export default function SetlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setlists, deleteSetlist } = useSetlistStore();
  const { songs } = useSongStore();
  const { setCurrentSetlist, unloadAudio } = usePlayerStore();
  const [showOptions, setShowOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { colors } = useTheme();
  
  const setlist = setlists[id];
  
  if (!setlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Setlist not found</Text>
      </View>
    );
  }
  
  const setlistSongs = setlist.songs
    .map(songId => songs[songId])
    .filter(Boolean);
  
  const handleStartLiveMode = async () => {
    // First unload any existing audio to prevent duplication
    await unloadAudio();
    
    // Then set the current setlist and navigate
    setCurrentSetlist(setlist.id, 0, false);
    router.push(`/live/${setlist.id}`);
  };
  
  const handleStartPracticeMode = async () => {
    // First unload any current audio to prevent duplication
    await unloadAudio();
    
    // Then set the current setlist and navigate
    setCurrentSetlist(setlist.id, 0, false);
    router.push(`/practice/${setlist.id}`);
  };
  
  const handleEdit = () => {
    router.push(`/setlists/edit/${setlist.id}`);
    setShowOptions(false);
  };
  
  const handleDelete = () => {
    Alert.alert(
      "Delete Setlist",
      `Are you sure you want to delete "${setlist.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            deleteSetlist(setlist.id);
            router.back();
          },
          style: "destructive"
        }
      ]
    );
    setShowOptions(false);
  };
  
  const handleShare = async () => {
    try {
      setIsSharing(true);
      setShowOptions(false);
      
      await shareSetlist(setlist, songs);
      
      Alert.alert(
        'Setlist Shared',
        'Your setlist has been shared. When others open the .setmaster file, it will automatically import into their SetMaster Pro app.'
      );
    } catch (error) {
      console.error('Error sharing setlist:', error);
      Alert.alert(
        'Sharing Failed',
        'There was a problem sharing this setlist. Please try again.'
      );
    } finally {
      setIsSharing(false);
    }
  };
  
  const renderItem = ({ item }: { item: typeof setlistSongs[0] }) => (
    <SongItem song={item} />
  );
  
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
          <Text style={[styles.title, { color: colors.text }]}>{setlist.name}</Text>
          
          {setlist.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{setlist.description}</Text>
          )}
          
          <View style={styles.stats}>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {setlistSongs.length} {setlistSongs.length === 1 ? 'song' : 'songs'}
            </Text>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatDuration(setlist.duration)}
            </Text>
          </View>
        </View>
        
        <Pressable 
          style={styles.optionsButton}
          onPress={() => setShowOptions(!showOptions)}
        >
          <MoreVertical size={24} color={colors.text} />
        </Pressable>
      </View>
      
      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleStartLiveMode}
        >
          <View style={styles.playButtonCircle}>
            <Play size={20} color="#fff" />
          </View>
          <Text style={styles.actionButtonText}>Live Mode</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={handleStartPracticeMode}
        >
          <ListRestart size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Practice</Text>
        </Pressable>
      </View>
      
      <View style={styles.songsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Songs</Text>
        
        {setlistSongs.length > 0 ? (
          <FlatList
            data={setlistSongs}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <View style={styles.emptySongs}>
            <Text style={[styles.emptySongsText, { color: colors.textSecondary }]}>
              No songs in this setlist yet. Edit the setlist to add songs.
            </Text>
            <Pressable 
              style={[styles.emptyButton, { backgroundColor: colors.surface }]}
              onPress={handleEdit}
            >
              <Text style={[styles.emptyButtonText, { color: colors.primary }]}>
                Edit Setlist
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      
      {showOptions && (
        <Pressable 
          style={styles.optionsOverlay}
          onPress={() => setShowOptions(false)}
        >
          <View style={[styles.optionsMenu, { backgroundColor: colors.surface }]}>
            <Pressable style={styles.optionItem} onPress={handleEdit}>
              <Edit size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Edit</Text>
            </Pressable>
            <Pressable style={styles.optionItem} onPress={handleShare}>
              <Share2 size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Share</Text>
            </Pressable>
            <Pressable style={styles.optionItem} onPress={handleDelete}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
      
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingIndicator, { backgroundColor: colors.surface }]}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Preparing to share...</Text>
          </View>
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
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 14,
  },
  optionsButton: {
    padding: 8,
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 20,
  },
  optionsMenu: {
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 15,
    minWidth: 120,
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
  playButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a855f7', // Using the actual color value instead of colors.secondary
    justifyContent: 'center',
    alignItems: 'center',
  },
  songsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptySongs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptySongsText: {
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
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingIndicator: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
});