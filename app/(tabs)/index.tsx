import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, ListMusic, Music, Clock, BarChart2 } from 'lucide-react-native';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { usePlayerStore } from '@/store/playerStore';
import SetlistItem from '@/components/SetlistItem';
import SongItem from '@/components/SongItem';
import { useTheme } from '@/context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { setlists, setActiveSetlist } = useSetlistStore();
  const { songs } = useSongStore();
  const { setCurrentSetlist, unloadAudio } = usePlayerStore();
  const { colors } = useTheme();
  
  const recentSetlists = Object.values(setlists)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);
    
  const recentSongs = Object.values(songs)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  // Calculate statistics
  const totalSetlists = Object.keys(setlists).length;
  const totalSongs = Object.keys(songs).length;
  const totalMinutes = Math.round(
    Object.values(songs).reduce((total, song) => total + (song.duration || 0), 0) / 60
  );

  const handleSetlistPress = (id: string) => {
    setActiveSetlist(id);
    router.push(`/setlists/${id}`);
  };

  const handleStartLiveMode = async () => {
    if (recentSetlists.length > 0) {
      // First unload any existing audio to prevent duplication
      await unloadAudio();
      
      const setlistId = recentSetlists[0].id;
      setActiveSetlist(setlistId);
      router.push(`/live/${setlistId}`);
    } else {
      router.push('/setlists');
    }
  };

  // Play a setlist directly from the home screen
  const handlePlaySetlist = async (setlistId: string) => {
    // Set the current setlist in the player store and start playing
    await setCurrentSetlist(setlistId, 0, true);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>SetMaster Pro</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your live performance companion</Text>
      </View>
      
      {/* Statistics Card */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
        <View style={styles.statsTitleContainer}>
          <BarChart2 size={18} color={colors.primary} style={styles.statsIcon} />
          <Text style={[styles.statsTitle, { color: colors.text }]}>Your Library</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalSetlists}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Setlists</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalSongs}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Songs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutes</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.quickActions}>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={handleStartLiveMode}
        >
          <Play size={24} color="#fff" />
          <Text style={styles.actionText}>Start Live Mode</Text>
        </Pressable>
        
        <View style={styles.actionRow}>
          <Pressable 
            style={[styles.smallActionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/setlists/new')}
          >
            <ListMusic size={20} color={colors.primary} />
            <Text style={[styles.smallActionText, { color: colors.text }]}>New Setlist</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.smallActionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/songs/new')}
          >
            <Music size={20} color={colors.primary} />
            <Text style={[styles.smallActionText, { color: colors.text }]}>New Song</Text>
          </Pressable>
        </View>
      </View>
      
      {recentSetlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Setlists</Text>
            <Pressable onPress={() => router.push('/setlists')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>
          
          {recentSetlists.map((setlist) => (
            <SetlistItem 
              key={setlist.id} 
              setlist={setlist} 
              onPress={() => handleSetlistPress(setlist.id)}
              onPlayPress={() => handlePlaySetlist(setlist.id)}
              showPlayButton={true}
            />
          ))}
        </View>
      )}
      
      {recentSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Songs</Text>
            <Pressable onPress={() => router.push('/songs')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>
          
          {recentSongs.map((song) => (
            <SongItem 
              key={song.id} 
              song={song} 
            />
          ))}
        </View>
      )}
      
      {recentSetlists.length === 0 && recentSongs.length === 0 && (
        <View style={styles.emptyState}>
          <Plus size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Get Started</Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            Create your first setlist or add songs to start managing your performances.
          </Text>
          <View style={styles.emptyStateActions}>
            <Pressable 
              style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/songs/new')}
            >
              <Text style={styles.emptyStateButtonText}>Add a Song</Text>
            </Pressable>
            <Pressable 
              style={[styles.emptyStateButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/setlists/new')}
            >
              <Text style={[styles.emptyStateButtonText, { color: colors.primary }]}>
                Create a Setlist
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  statsCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsIcon: {
    marginRight: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
  },
  quickActions: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  smallActionText: {
    fontSize: 14,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateActions: {
    width: '100%',
    gap: 12,
  },
  emptyStateButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});