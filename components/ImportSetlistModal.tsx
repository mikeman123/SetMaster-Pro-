import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  ActivityIndicator, 
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { X, FileDown, Check } from 'lucide-react-native';
import { importSetlistFromFile } from '@/utils/shareUtils';
import { generateId } from '@/utils/idUtils';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { Setlist, Song } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

interface ImportSetlistModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ImportSetlistModal({ visible, onClose }: ImportSetlistModalProps) {
  const { colors } = useTheme();
  const { addSetlist } = useSetlistStore();
  const { songs: existingSongs, addSong } = useSongStore();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState<{
    setlist: Partial<Setlist>;
    songs: Partial<Song>[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleImport = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Importing setlists is not available on web.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await importSetlistFromFile();
      if (data) {
        setImportedData(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
        'Failed to import setlist. Please make sure the file is a valid .setmaster file.';
      setError(errorMessage);
      console.error('Import error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmImport = () => {
    if (!importedData) return;
    
    try {
      // First, import all songs with new IDs
      const songIdMap: Record<string, string> = {};
      const now = Date.now();
      
      // Process songs
      const newSongs = importedData.songs
        .filter(song => song !== null)
        .map(importedSong => {
          const oldId = importedSong.id || '';
          const newId = generateId();
          songIdMap[oldId] = newId;
          
          // Check if a similar song already exists
          const existingSong = Object.values(existingSongs).find(
            song => song.title === importedSong.title && song.artist === importedSong.artist
          );
          
          if (existingSong) {
            // Use existing song ID instead
            songIdMap[oldId] = existingSong.id;
            return null; // Skip adding this song
          }
          
          // Create a new song
          return {
            ...importedSong,
            id: newId,
            createdAt: now,
            updatedAt: now,
          };
        })
        .filter(Boolean) as Song[];
      
      // Add all new songs
      newSongs.forEach(song => {
        if (song) {
          addSong(song);
        }
      });
      
      // Now create the setlist with the new song IDs
      const newSetlistSongs = (importedData.setlist.songs || []).map(
        (oldId: string) => songIdMap[oldId] || oldId
      );
      
      const newSetlist: Setlist = {
        id: generateId(),
        name: importedData.setlist.name || 'Imported Setlist',
        description: importedData.setlist.description,
        songs: newSetlistSongs,
        duration: importedData.setlist.duration || 0,
        createdAt: now,
        updatedAt: now,
      };
      
      addSetlist(newSetlist);
      
      Alert.alert(
        'Import Successful', 
        `Imported setlist "${newSetlist.name}" with ${newSetlistSongs.length} songs.`,
        [{ 
          text: 'View Setlist', 
          onPress: () => {
            onClose();
            router.push(`/setlists/${newSetlist.id}`);
          }
        }, {
          text: 'Close',
          onPress: onClose
        }]
      );
      
      // Reset state
      setImportedData(null);
    } catch (err) {
      setError('Failed to process imported data.');
      console.error('Process import error:', err);
    }
  };
  
  const handleCancel = () => {
    setImportedData(null);
    setError(null);
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import Setlist</Text>
            <Pressable 
              style={styles.closeButton}
              onPress={handleCancel}
            >
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <View style={styles.modalBody}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading setlist...
                </Text>
              </View>
            ) : importedData ? (
              <ScrollView style={styles.previewContainer}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  Ready to Import
                </Text>
                
                <View style={[styles.previewCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                    Setlist Name
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {importedData.setlist.name}
                  </Text>
                  
                  {importedData.setlist.description && (
                    <>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                        Description
                      </Text>
                      <Text style={[styles.previewValue, { color: colors.text }]}>
                        {importedData.setlist.description}
                      </Text>
                    </>
                  )}
                  
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                    Songs
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {importedData.songs.length} songs
                  </Text>
                  
                  <View style={styles.songsList}>
                    {importedData.songs.map((song, index) => (
                      <View key={index} style={[styles.songItem, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.songTitle, { color: colors.text }]}>
                          {song.title}
                        </Text>
                        <Text style={[styles.songArtist, { color: colors.textSecondary }]}>
                          {song.artist}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <Pressable 
                  style={[styles.importButton, { backgroundColor: colors.primary }]}
                  onPress={handleConfirmImport}
                >
                  <Check size={20} color="#fff" />
                  <Text style={styles.importButtonText}>Confirm Import</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.importPrompt}>
                <FileDown size={48} color={colors.primary} />
                <Text style={[styles.importPromptTitle, { color: colors.text }]}>
                  Import a Setlist
                </Text>
                <Text style={[styles.importPromptText, { color: colors.textSecondary }]}>
                  Select a .setmaster file to import. This will add the setlist and all its songs to your library.
                </Text>
                
                {error && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                  </Text>
                )}
                
                <Pressable 
                  style={[styles.importButton, { backgroundColor: colors.primary }]}
                  onPress={handleImport}
                >
                  <FileDown size={20} color="#fff" />
                  <Text style={styles.importButtonText}>Select .setmaster File</Text>
                </Pressable>
                
                <Text style={[styles.importNote, { color: colors.textSecondary }]}>
                  You can also open .setmaster files directly from other apps to import them.
                </Text>
                
                {Platform.OS === 'web' && (
                  <Text style={[styles.webNotice, { color: colors.textSecondary }]}>
                    Note: Importing setlists is not available on web.
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  importPrompt: {
    alignItems: 'center',
    padding: 20,
  },
  importPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  importPromptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  importNote: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  webNotice: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  previewContainer: {
    maxHeight: 400,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  songsList: {
    marginTop: 8,
  },
  songItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  songArtist: {
    fontSize: 14,
  },
});