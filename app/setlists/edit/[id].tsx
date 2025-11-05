import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Save, X, Plus, Sparkles } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import SongItem from '@/components/SongItem';
import DraggableSongItem from '@/components/DraggableSongItem';

export default function EditSetlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setlists, updateSetlist } = useSetlistStore();
  const { songs } = useSongStore();
  
  const setlist = setlists[id];
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (setlist) {
      setName(setlist.name);
      setDescription(setlist.description || '');
      setSelectedSongIds(setlist.songs);
    }
  }, [setlist]);
  
  if (!setlist) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Setlist not found</Text>
      </View>
    );
  }
  
  const isFormValid = name.trim() !== '';
  
  const availableSongs = Object.values(songs)
    .filter(song => !selectedSongIds.includes(song.id))
    .filter(song => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.title.localeCompare(b.title));
    
  const selectedSongs = selectedSongIds
    .map(id => songs[id])
    .filter(Boolean);
    
  const totalDuration = selectedSongs.reduce((total, song) => total + song.duration, 0);
  
  const handleSave = () => {
    if (!isFormValid) return;
    
    updateSetlist(id, {
      name: name.trim(),
      description: description.trim(),
      songs: selectedSongIds,
      duration: totalDuration,
      updatedAt: Date.now(),
    });
    
    router.back();
  };
  
  const handleAddSong = (songId: string) => {
    setSelectedSongIds([...selectedSongIds, songId]);
    setShowSongSelector(false);
    setSearchQuery('');
  };
  
  const handleRemoveSong = (songId: string) => {
    setSelectedSongIds(selectedSongIds.filter(id => id !== songId));
  };
  
  const handleMoveSong = (fromIndex: number, toIndex: number) => {
    const newOrder = [...selectedSongIds];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setSelectedSongIds(newOrder);
  };

  const handleAIReorder = async (quickOptimize: boolean = false) => {
    if (selectedSongIds.length < 2) {
      Alert.alert('Not enough songs', 'Add at least 2 songs to use AI reordering');
      return;
    }

    setIsAIProcessing(true);
    
    try {
      const songsData = selectedSongIds.map(id => {
        const song = songs[id];
        return {
          id: song.id,
          title: song.title,
          artist: song.artist,
          key: song.key,
          tempo: song.tempo,
          duration: song.duration
        };
      });

      const systemPrompt = `You are a professional setlist organizer. Analyze the given songs and reorder them for optimal flow in a live performance. Consider:
- Energy levels and tempo transitions
- Key compatibility between adjacent songs  
- Overall arc of the performance (opening, building energy, peaks, valleys, closing)
- Avoid putting very similar songs back-to-back
- Artist variety (if multiple artists)

Return ONLY a JSON array of song IDs in the new order, nothing else.`;

      const userMessage = quickOptimize || !aiPrompt.trim()
        ? `Songs to reorder: ${JSON.stringify(songsData)}\n\nOptimize this setlist for the best flow and energy progression. Return only the reordered array of song IDs.`
        : `Songs to reorder: ${JSON.stringify(songsData)}\n\nUser instructions: ${aiPrompt}\n\nReturn only the reordered array of song IDs.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      try {
        // Try to extract JSON from the response
        let completion = data.completion;
        
        // Remove any markdown code blocks if present
        completion = completion.replace(/```json\n?/gi, '').replace(/```\n?/gi, '');
        
        // Try to find JSON array in the response
        const jsonMatch = completion.match(/\[.*\]/s);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }
        
        const newOrder = JSON.parse(jsonMatch[0]);
        
        // Validate that all song IDs are present
        if (Array.isArray(newOrder) && newOrder.length === selectedSongIds.length) {
          const isValid = newOrder.every(id => selectedSongIds.includes(id));
          
          if (isValid) {
            setSelectedSongIds(newOrder);
            if (!quickOptimize) {
              setShowAIAssistant(false);
              setAiPrompt('');
            }
            Alert.alert('Success', 'Setlist has been reordered by AI');
          } else {
            throw new Error('Invalid song IDs in response');
          }
        } else {
          throw new Error('Invalid response format - expected array of ' + selectedSongIds.length + ' items');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw response:', data.completion);
        Alert.alert('Error', 'Failed to process AI response. Please try again.');
      }
    } catch (error) {
      console.error('AI reorder error:', error);
      Alert.alert('Error', 'Failed to reorder setlist. Please try again.');
    } finally {
      setIsAIProcessing(false);
    }
  };
  
  const ITEM_HEIGHT = 80; // Approximate height of each song item
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable 
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <X size={24} color={colors.dark.text} />
        </Pressable>
        
        <Text style={styles.headerTitle}>Edit Setlist</Text>
        
        <Pressable 
          style={[
            styles.headerButton,
            !isFormValid && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={!isFormValid}
        >
          <Save size={24} color={isFormValid ? colors.dark.primary : colors.dark.textSecondary} />
        </Pressable>
      </View>
      
      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter setlist name"
            placeholderTextColor={colors.dark.textSecondary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description (optional)"
            placeholderTextColor={colors.dark.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.songsSection}>
          <View style={styles.songsSectionHeader}>
            <View>
              <Text style={styles.songsSectionTitle}>Songs</Text>
              <Text style={styles.songsSectionSubtitle}>
                {selectedSongs.length} songs, {Math.floor(totalDuration / 60)} min
              </Text>
            </View>
            {selectedSongs.length >= 2 && (
              <Pressable 
                style={styles.aiButton}
                onPress={() => setShowAIAssistant(true)}
              >
                <Sparkles size={20} color={colors.dark.primary} />
                <Text style={styles.aiButtonText}>AI Reorder</Text>
              </Pressable>
            )}
          </View>
          
          {selectedSongs.map((song, index) => (
            <DraggableSongItem
              key={song.id}
              song={song}
              index={index}
              onMove={handleMoveSong}
              onRemove={handleRemoveSong}
              itemHeight={ITEM_HEIGHT}
              totalItems={selectedSongs.length}
            />
          ))}
          
          <Pressable 
            style={styles.addSongButton}
            onPress={() => setShowSongSelector(true)}
          >
            <Plus size={20} color={colors.dark.primary} />
            <Text style={styles.addSongButtonText}>Add Song</Text>
          </Pressable>
        </View>
      </ScrollView>
      
      <Modal
        visible={showAIAssistant}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIAssistant(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <Pressable 
              style={styles.modalOverlayTouchable} 
              onPress={() => {
                setShowAIAssistant(false);
                setAiPrompt('');
              }}
            />
            <View style={styles.aiModal}>
            <View style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>AI Setlist Assistant</Text>
              <Pressable 
                style={styles.aiModalCloseButton}
                onPress={() => {
                  setShowAIAssistant(false);
                  setAiPrompt('');
                }}
              >
                <X size={24} color={colors.dark.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.aiModalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.aiModalDescription}>
                Let AI help you reorder your setlist for better flow. You can provide specific instructions or let AI optimize automatically.
              </Text>
              
              <Pressable 
                style={[styles.quickOptimizeButton]}
                onPress={() => handleAIReorder(true)}
                disabled={isAIProcessing}
              >
                {isAIProcessing ? (
                  <ActivityIndicator size="small" color={colors.dark.primary} />
                ) : (
                  <>
                    <Sparkles size={20} color={colors.dark.primary} />
                    <Text style={styles.quickOptimizeButtonText}>Quick Optimize</Text>
                  </>
                )}
              </Pressable>
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>
              
              <Text style={styles.aiModalLabel}>Custom Instructions</Text>
              <TextInput
                style={[styles.input, styles.aiPromptInput]}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="e.g., Start with high energy, put ballads in the middle, end strong"
                placeholderTextColor={colors.dark.textSecondary}
                multiline
                textAlignVertical="top"
                editable={!isAIProcessing}
              />
              
              <View style={styles.aiModalButtons}>
                <Pressable 
                  style={[styles.aiModalButton, styles.aiModalCancelButton]}
                  onPress={() => {
                    setShowAIAssistant(false);
                    setAiPrompt('');
                  }}
                  disabled={isAIProcessing}
                >
                  <Text style={styles.aiModalCancelButtonText}>Cancel</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.aiModalButton, styles.aiModalReorderButton, isAIProcessing && styles.disabledButton]}
                  onPress={() => handleAIReorder(false)}
                  disabled={isAIProcessing}
                >
                  {isAIProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={20} color="#fff" />
                      <Text style={styles.aiModalReorderButtonText}>Reorder Setlist</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {showSongSelector && (
        <View style={styles.songSelector}>
          <View style={styles.songSelectorHeader}>
            <Text style={styles.songSelectorTitle}>Select a Song</Text>
            <Pressable 
              style={styles.songSelectorCloseButton}
              onPress={() => {
                setShowSongSelector(false);
                setSearchQuery('');
              }}
            >
              <X size={24} color={colors.dark.text} />
            </Pressable>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search songs by title or artist..."
              placeholderTextColor={colors.dark.textSecondary}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <X size={20} color={colors.dark.textSecondary} />
              </Pressable>
            )}
          </View>
          
          <ScrollView style={styles.songSelectorList}>
            {availableSongs.length > 0 ? (
              availableSongs.map(song => (
                <SongItem 
                  key={song.id}
                  song={song}
                  onPress={() => handleAddSong(song.id)}
                />
              ))
            ) : (
              <View style={styles.emptySongSelector}>
                <Text style={styles.emptySongSelectorText}>
                  No more songs available. Create new songs first.
                </Text>
                <Pressable 
                  style={[styles.emptySongSelectorButton, { backgroundColor: colors.dark.primary }]}
                  onPress={() => {
                    setShowSongSelector(false);
                    setSearchQuery('');
                    router.push('/songs/new');
                  }}
                >
                  <Text style={styles.emptySongSelectorButtonText}>Create a Song</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  headerButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    padding: 12,
    color: colors.dark.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  songsSection: {
    marginTop: 16,
  },
  songsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  aiButtonText: {
    fontSize: 14,
    color: colors.dark.primary,
    fontWeight: '600',
  },
  songsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  songsSectionSubtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },

  addSongButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    marginTop: 8,
  },
  addSongButtonText: {
    fontSize: 16,
    color: colors.dark.primary,
    marginLeft: 8,
  },
  songSelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dark.background,
    zIndex: 10,
  },
  songSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  songSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  songSelectorCloseButton: {
    padding: 8,
  },
  songSelectorList: {
    flex: 1,
    padding: 16,
  },
  songSelectorItem: {
    marginBottom: 8,
  },
  emptySongSelector: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptySongSelectorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptySongSelectorButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptySongSelectorButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorText: {
    fontSize: 18,
    color: colors.dark.error,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  aiModal: {
    backgroundColor: colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  aiModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  aiModalCloseButton: {
    padding: 4,
  },
  aiModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  quickOptimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.background,
    borderWidth: 2,
    borderColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  quickOptimizeButtonText: {
    fontSize: 16,
    color: colors.dark.primary,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginHorizontal: 12,
    fontWeight: '600',
  },
  aiModalDescription: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  aiModalLabel: {
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  aiPromptInput: {
    minHeight: 100,
    paddingTop: 12,
    marginBottom: 20,
  },
  aiModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  aiModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  aiModalCancelButton: {
    backgroundColor: colors.dark.background,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  aiModalCancelButtonText: {
    fontSize: 16,
    color: colors.dark.text,
    fontWeight: '600',
  },
  aiModalReorderButton: {
    backgroundColor: colors.dark.primary,
  },
  aiModalReorderButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    padding: 12,
    color: colors.dark.text,
    fontSize: 16,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
});