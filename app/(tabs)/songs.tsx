import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useSongStore } from '@/store/songStore';
import SongItem from '@/components/SongItem';
import { TextInput } from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeContext';

export default function SongsScreen() {
  const router = useRouter();
  const { songs } = useSongStore();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const songArray = Object.values(songs)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(song => 
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const renderItem = ({ item }: { item: typeof songArray[0] }) => (
    <SongItem song={item} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search songs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <Pressable 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/songs/new')}
        >
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>
      
      {songArray.length > 0 ? (
        <FlatList
          data={songArray}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          {searchQuery ? (
            <>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No results found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No songs match your search query.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No songs yet</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Add your first song to get started.
              </Text>
              <Pressable 
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/songs/new')}
              >
                <Text style={styles.emptyStateButtonText}>Add a Song</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});