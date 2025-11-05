import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, FileDown } from 'lucide-react-native';
import { useSetlistStore } from '@/store/setlistStore';
import SetlistItem from '@/components/SetlistItem';
import { TextInput } from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeContext';
import ImportSetlistModal from '@/components/ImportSetlistModal';

export default function SetlistsScreen() {
  const router = useRouter();
  const { setlists, setActiveSetlist } = useSetlistStore();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  const setlistArray = Object.values(setlists)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(setlist => 
      setlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (setlist.description && setlist.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handleSetlistPress = (id: string) => {
    setActiveSetlist(id);
    router.push(`/setlists/${id}`);
  };

  const renderItem = ({ item }: { item: typeof setlistArray[0] }) => (
    <SetlistItem 
      setlist={item} 
      onPress={() => handleSetlistPress(item.id)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search setlists..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowImportModal(true)}
        >
          <FileDown size={24} color={colors.primary} />
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/setlists/new')}
        >
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>
      
      {setlistArray.length > 0 ? (
        <FlatList
          data={setlistArray}
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
                No setlists match your search query.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No setlists yet</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Create your first setlist to organize your songs for performances.
              </Text>
              <Pressable 
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/setlists/new')}
              >
                <Text style={styles.emptyStateButtonText}>Create a Setlist</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      
      <ImportSetlistModal 
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
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
  actionButton: {
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