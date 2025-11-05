import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Setlist, Song } from '@/types';
import * as Linking from 'expo-linking';

/**
 * Prepares a setlist for sharing by including all necessary data
 */
export const prepareSetlistForSharing = (
  setlist: Setlist, 
  songs: Record<string, Song>
): string => {
  // Create a deep copy of the setlist
  const setlistCopy = { ...setlist };
  
  // Include the actual song data, not just IDs
  const includedSongs = setlistCopy.songs
    .map(songId => songs[songId])
    .filter(Boolean)
    .map(song => ({
      ...song,
      // Remove local file URIs as they won't work on another device
      audioUri: undefined,
      audioFileName: song.audioFileName,
    }));
  
  const shareData = {
    type: 'setmaster-setlist',
    version: '1.0',
    setlist: {
      ...setlistCopy,
      // Generate new IDs when importing
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    },
    songs: includedSongs,
  };
  
  return JSON.stringify(shareData);
};

/**
 * Shares a setlist with other apps
 */
export const shareSetlist = async (
  setlist: Setlist, 
  songs: Record<string, Song>
): Promise<void> => {
  try {
    const shareData = prepareSetlistForSharing(setlist, songs);
    
    if (Platform.OS === 'web') {
      // For web, we can use the clipboard
      // This would require a clipboard library, but for now we'll just alert
      alert('Sharing is not available on web');
      return;
    }
    
    // On mobile, we can use the Share API
    // First save the data to a temporary file with a custom extension
    const sanitizedName = setlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileUri = `${(FileSystem as any).cacheDirectory}${sanitizedName}_setlist.setmaster`;
    await FileSystem.writeAsStringAsync(fileUri, shareData);
    
    // Create a deep link URL that can be used to open the app
    const appUrl = Linking.createURL('setlist/import', {
      queryParams: { name: setlist.name }
    });
    
    // Then share the file
    await Share.share({
      title: `${setlist.name} - SetMaster Pro Setlist`,
      message: `Check out my setlist "${setlist.name}" from SetMaster Pro!

Open in SetMaster Pro: ${appUrl}`,
      url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
    });
  } catch (error) {
    console.error('Error sharing setlist:', error);
    throw error;
  }
};

/**
 * Imports a setlist from a JSON file
 */
export const importSetlistFromFile = async (fileUri?: string): Promise<{
  setlist: Partial<Setlist>;
  songs: Partial<Song>[];
} | null> => {
  try {
    let uri = fileUri;
    
    // If no URI is provided, prompt the user to select a file
    if (!uri) {
      // Pick a .setmaster file specifically
      const result = await DocumentPicker.getDocumentAsync({
        // Use a custom MIME type for .setmaster files
        // This will filter to only show .setmaster files on supported platforms
        type: [
          // Custom MIME type for our app's files
          "application/x-setmaster",
          // Fallback types for different platforms
          "application/octet-stream",
          "application/json"
        ],
        copyToCacheDirectory: true,
        // Add file extension filter for platforms that support it
        ...(Platform.OS === 'ios' ? { utis: ["public.item", "public.data"] } : {}),
      });
      
      if (result.canceled) {
        return null;
      }
      
      // Check if the file has the correct extension
      const fileName = result.assets[0].name || "";
      if (!fileName.toLowerCase().endsWith('.setmaster')) {
        throw new Error('Please select a .setmaster file');
      }
      
      uri = result.assets[0].uri;
    }
    
    console.log('Reading file from URI:', uri);
    
    // Read the file contents
    const fileContents = await FileSystem.readAsStringAsync(uri);
    
    // Parse the JSON data
    const importData = JSON.parse(fileContents);
    
    // Validate the data
    if (
      !importData.type || 
      importData.type !== 'setmaster-setlist' ||
      !importData.setlist ||
      !importData.songs
    ) {
      throw new Error('Invalid setlist file format');
    }
    
    return {
      setlist: importData.setlist,
      songs: importData.songs,
    };
  } catch (error) {
    console.error('Error importing setlist:', error);
    throw error;
  }
};

/**
 * Processes a deep link URL that might contain a setlist file
 */
export const processDeepLink = async (url: string): Promise<{
  setlist: Partial<Setlist>;
  songs: Partial<Song>[];
} | null> => {
  try {
    console.log('Processing deep link URL:', url);
    
    // Extract the file path from the URL if it exists
    let fileUri = null;
    
    // Handle different URL formats
    if (url.startsWith('file://')) {
      // Direct file URL
      fileUri = url;
    } else if (url.includes('content://')) {
      // Content URI (Android)
      fileUri = url;
    } else if (url.includes('setmaster://')) {
      // Custom scheme with file path
      // Extract the path after setmaster://
      const path = url.replace('setmaster://', '');
      if (path.startsWith('file://') || path.includes('content://')) {
        fileUri = path;
      }
    } else if (url.includes('file=')) {
      // URL with file parameter
      const urlObj = new URL(url);
      const fileParam = urlObj.searchParams.get('file');
      if (fileParam) {
        fileUri = decodeURIComponent(fileParam);
      }
    }
    
    if (fileUri) {
      console.log('Extracted file URI:', fileUri);
      return await importSetlistFromFile(fileUri);
    }
    
    return null;
  } catch (error) {
    console.error('Error processing deep link:', error);
    return null;
  }
};