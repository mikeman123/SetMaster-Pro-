import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { Music, X, Play, Pause } from 'lucide-react-native';
import colors from '@/constants/colors';

interface AudioFileSelectorProps {
  audioUri?: string;
  audioFileName?: string;
  onAudioSelected: (uri: string, fileName: string, duration: number) => void;
  onAudioRemoved: () => void;
}

export default function AudioFileSelector({
  audioUri,
  audioFileName,
  onAudioSelected,
  onAudioRemoved
}: AudioFileSelectorProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [webAudio, setWebAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Initialize audio session
    const setupAudio = async () => {
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            allowsRecordingIOS: false,
          });
        } catch (error) {
          console.error('Failed to set audio mode:', error);
        }
      }
    };
    
    setupAudio();
    
    return () => {
      if (Platform.OS === 'web') {
        if (webAudio) {
          webAudio.pause();
          webAudio.src = '';
          webAudio.load();
        }
        // Clean up file input
        if (fileInputRef.current && document.body.contains(fileInputRef.current)) {
          document.body.removeChild(fileInputRef.current);
        }
      } else {
        if (sound) {
          sound.unloadAsync();
        }
      }
    };
  }, [sound, webAudio]);

  const pickAudioFileWeb = () => {
    if (Platform.OS !== 'web') return;
    
    // Create file input if it doesn't exist
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    fileInputRef.current.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);

      try {
        // Create object URL for the file
        const fileUri = URL.createObjectURL(file);
        const fileName = file.name;

        console.log('Selected audio file (web):', fileName, 'URI:', fileUri);

        // Get audio duration using HTML5 Audio
        const audio = new (window as any).Audio();
        audio.preload = 'metadata';
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000); // 10 second timeout
          
          audio.onloadedmetadata = () => {
            clearTimeout(timeout);
            const durationSeconds = audio.duration || 180;
            console.log('Audio duration (web):', durationSeconds);
            onAudioSelected(fileUri, fileName, durationSeconds);
            resolve();
          };
          
          audio.onerror = (e: any) => {
            clearTimeout(timeout);
            console.error('Audio loading error:', e);
            reject(new Error('Failed to load audio file - unsupported format or corrupted file'));
          };
          
          // Set source and trigger loading
          audio.src = fileUri;
          audio.load();
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error processing audio file (web):', err);
        setError('Failed to process audio file');
        setIsLoading(false);
      }
    };

    fileInputRef.current.click();
  };

  const pickAudioFile = async () => {
    if (Platform.OS === 'web') {
      pickAudioFileWeb();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'], // Accept all audio types, we'll validate later
        copyToCacheDirectory: false // Don't copy to cache, we'll handle permanent storage
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const asset = result.assets[0];
      const originalUri = asset.uri;
      const fileName = asset.name || 'audio_file';

      console.log('Selected audio file:', fileName, 'Original URI:', originalUri);

      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(originalUri);
      if (!fileInfo.exists) {
        setError("File doesn't exist");
        setIsLoading(false);
        return;
      }

      // Create permanent storage directory if it doesn't exist
      const audioDir = `${(FileSystem as any).documentDirectory}audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      }

      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const permanentUri = `${audioDir}${uniqueFileName}`;

      // Copy file to permanent location
      console.log('Copying audio file to permanent location:', permanentUri);
      await FileSystem.copyAsync({
        from: originalUri,
        to: permanentUri
      });

      // Verify the copy was successful
      const copiedFileInfo = await FileSystem.getInfoAsync(permanentUri);
      if (!copiedFileInfo.exists) {
        setError("Failed to save audio file");
        setIsLoading(false);
        return;
      }

      console.log('Audio file copied successfully to:', permanentUri);

      // Get audio duration
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: permanentUri },
          { shouldPlay: false },
          null,
          false // downloadFirst = false for local files
        );
        
        const status = await newSound.getStatusAsync();
        let durationSeconds = 0;
        
        if (status.isLoaded) {
          const durationMillis = status.durationMillis || 0;
          durationSeconds = durationMillis / 1000;
          console.log('Audio duration:', durationSeconds);
        } else {
          console.log('Audio status not loaded:', status);
          // Default duration if we can't get it
          durationSeconds = 180;
        }
        
        await newSound.unloadAsync();
        
        onAudioSelected(permanentUri, fileName, durationSeconds);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error getting audio duration:", err);
        
        // Provide specific error messages based on error type
        let errorMessage = "Failed to process audio file";
        if (err.message?.includes('-11800') || err.message?.includes('-11819') || err.message?.includes('AVFoundationErrorDomain')) {
          errorMessage = "Audio format not supported. Please use MP3, M4A, or WAV files.";
        } else if (err.message?.includes('-17913') || err.message?.includes('unknown error')) {
          errorMessage = "Audio file appears to be corrupted or incompatible. Please select a different file.";
        }
        
        // Clean up the copied file if duration check fails
        try {
          await FileSystem.deleteAsync(permanentUri);
        } catch (deleteErr) {
          console.error("Error cleaning up file:", deleteErr);
        }
        
        setError(errorMessage);
        Alert.alert("Audio Error", errorMessage);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error picking audio file:", err);
      setError("Failed to pick audio file");
      setIsLoading(false);
    }
  };

  const togglePlaybackWeb = () => {
    if (!audioUri || Platform.OS !== 'web') return;

    try {
      if (webAudio) {
        if (isPlaying) {
          webAudio.pause();
          setIsPlaying(false);
        } else {
          const playPromise = webAudio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch((err: any) => {
                console.error('Error playing web audio:', err);
                setError('Audio playback failed. Please try again.');
                setIsPlaying(false);
              });
          } else {
            setIsPlaying(true);
          }
        }
      } else {
        setIsLoading(true);
        console.log('Creating new web audio for preview:', audioUri);
        
        const audio = new (window as any).Audio();
        audio.volume = 1.0;
        audio.preload = 'metadata';
        
        audio.onended = () => {
          setIsPlaying(false);
        };
        
        audio.onerror = (e: any) => {
          console.error('Error loading web audio:', e);
          setError('Audio file could not be loaded. Please check the file format.');
          setIsPlaying(false);
          setIsLoading(false);
        };
        
        audio.oncanplay = () => {
          setIsLoading(false);
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch((err: any) => {
                console.error('Error playing web audio:', err);
                setError('Audio playback failed. Please try again.');
                setIsPlaying(false);
              });
          } else {
            setIsPlaying(true);
          }
        };
        
        audio.onloadstart = () => {
          setError(null);
        };
        
        // Set the source after setting up event handlers
        audio.src = audioUri;
        audio.load();
        
        setWebAudio(audio);
      }
    } catch (err) {
      console.error('Error in web audio playback:', err);
      setError('Audio playback is not supported in this browser.');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (!audioUri) return;

    if (Platform.OS === 'web') {
      togglePlaybackWeb();
      return;
    }

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoading(true);
        console.log('Creating new sound for preview:', audioUri);
        
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { 
              shouldPlay: true,
              volume: 1.0, // Ensure volume is at maximum
              progressUpdateIntervalMillis: 500
            },
            (status) => {
              if (!status.isLoaded) return;
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            },
            false // downloadFirst = false for local files
          );
          
          setSound(newSound);
          setIsPlaying(true);
        } catch (err: any) {
          console.error("Error creating sound:", err);
          
          let errorMessage = "Failed to play audio file";
          if (err.message?.includes('-11800') || err.message?.includes('-11819') || err.message?.includes('AVFoundationErrorDomain')) {
            errorMessage = "Audio format not supported. Please use MP3, M4A, or WAV files.";
          } else if (err.message?.includes('-17913') || err.message?.includes('unknown error')) {
            errorMessage = "Audio file appears to be corrupted or incompatible. Please try re-importing the file.";
          }
          
          Alert.alert("Playback Error", errorMessage);
          setError(errorMessage);
        }
        
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      setError("Failed to play audio file");
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleRemoveAudio = async () => {
    if (Platform.OS === 'web') {
      if (webAudio) {
        try {
          if (isPlaying) {
            webAudio.pause();
          }
          webAudio.src = '';
          webAudio.load();
        } catch (err) {
          console.error('Error cleaning up web audio:', err);
        }
        setWebAudio(null);
        setIsPlaying(false);
      }
    } else {
      if (sound) {
        try {
          if (isPlaying) {
            await sound.stopAsync();
          }
          await sound.unloadAsync();
        } catch (err) {
          console.error("Error unloading sound:", err);
        }
        setSound(null);
        setIsPlaying(false);
      }
    }
    onAudioRemoved();
  };



  return (
    <View style={styles.container}>
      {!audioUri ? (
        <Pressable 
          style={styles.selectButton}
          onPress={pickAudioFile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.dark.primary} />
          ) : (
            <>
              <Music size={24} color={colors.dark.primary} />
              <Text style={styles.selectButtonText}>Select Audio File</Text>
            </>
          )}
        </Pressable>
      ) : (
        <View style={styles.audioFileContainer}>
          <View style={styles.audioFileInfo}>
            <Music size={24} color={colors.dark.primary} />
            <Text style={styles.audioFileName} numberOfLines={1}>
              {audioFileName}
            </Text>
          </View>
          
          <View style={styles.audioControls}>
            <Pressable 
              style={styles.playButton}
              onPress={togglePlayback}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.dark.text} />
              ) : isPlaying ? (
                <Pause size={20} color={colors.dark.text} />
              ) : (
                <Play size={20} color={colors.dark.text} />
              )}
            </Pressable>
            
            <Pressable 
              style={styles.removeButton}
              onPress={handleRemoveAudio}
            >
              <X size={20} color={colors.dark.error} />
            </Pressable>
          </View>
        </View>
      )}
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.dark.primary,
  },
  audioFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
  },
  audioFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  audioFileName: {
    fontSize: 14,
    color: colors.dark.text,
    flex: 1,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.dark.error,
    marginTop: 8,
  },
  webMessage: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    padding: 12,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
  },
});