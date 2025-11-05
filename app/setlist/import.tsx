import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { processDeepLink } from '@/utils/shareUtils';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { generateId } from '@/utils/idUtils';
import { Song } from '@/types';

export default function ImportSetlistScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState('Processing setlist...');
  
  const { addSetlist } = useSetlistStore();
  const { songs: existingSongs, addSong } = useSongStore();

  // This screen handles direct navigation to the import route
  useEffect(() => {
    const processImport = async () => {
      try {
        // Check if we have a URL in the params
        const url = params.url as string;
        
        if (url) {
          setMessage('Importing setlist from URL...');
          console.log('Import screen processing URL:', url);
          
          // Process the URL
          const importData = await processDeepLink(url);
          
          if (importData) {
            // Import the setlist
            importSetlistFromData(importData);
          } else {
            setMessage('No valid setlist found in the URL.');
            setTimeout(() => {
              router.replace('/(tabs)/setlists');
            }, 2000);
          }
        } else {
          // No URL provided, redirect to setlists
          setMessage('No import data provided.');
          setTimeout(() => {
            router.replace('/(tabs)/setlists');
          }, 1500);
        }
      } catch (error) {
        console.error('Error in import screen:', error);
        setMessage('Failed to import setlist.');
        Alert.alert(
          'Import Failed',
          'There was a problem importing the setlist. The file may be corrupted or in an unsupported format.'
        );
        setTimeout(() => {
          router.replace('/(tabs)/setlists');
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    };

    processImport();
  }, []);

  const importSetlistFromData = (importData: {
    setlist: Partial<any>;
    songs: Partial<any>[];
  }) => {
    try {
      // First, import all songs with new IDs
      const songIdMap: Record<string, string> = {};
      const now = Date.now();
      
      // Process songs
      const newSongs = importData.songs
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
      const newSetlistSongs = (importData.setlist.songs || []).map(
        (oldId: string) => songIdMap[oldId] || oldId
      );
      
      const newSetlist = {
        id: generateId(),
        name: importData.setlist.name || 'Imported Setlist',
        description: importData.setlist.description,
        songs: newSetlistSongs,
        duration: importData.setlist.duration || 0,
        createdAt: now,
        updatedAt: now,
      };
      
      addSetlist(newSetlist);
      
      // Show success message
      setMessage(`Successfully imported "${newSetlist.name}"`);
      
      // Navigate to the new setlist after a short delay
      setTimeout(() => {
        router.replace(`/setlists/${newSetlist.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error importing setlist data:', error);
      setMessage('Failed to process setlist data.');
      setTimeout(() => {
        router.replace('/(tabs)/setlists');
      }, 2000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isProcessing && <ActivityIndicator size="large" color={colors.primary} />}
      <Text style={[styles.text, { color: colors.text }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});