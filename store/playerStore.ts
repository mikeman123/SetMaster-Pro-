import { create } from 'zustand';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { PlaybackState } from '@/types';
import { useSongStore } from './songStore';
import { useSetlistStore } from './setlistStore';

interface PlayerState {
  playbackState: PlaybackState;
  currentSongId: string | null;
  currentSetlistId: string | null;
  currentSongIndex: number;
  sound: Audio.Sound | null;
  isSeekingInProgress: boolean; // Added to track seeking state
  isPlayerMinimized: boolean; // Added to track minimized state
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  setCurrentSong: (songId: string | null, shouldPlay?: boolean) => void;
  setCurrentSetlist: (setlistId: string | null, songIndex?: number, shouldPlay?: boolean) => void;
  nextSong: () => void;
  previousSong: () => void;
  loadAndPlayAudio: (uri: string, shouldPlay?: boolean) => Promise<void>;
  unloadAudio: () => Promise<void>;
  updatePlaybackStatus: () => void;
  togglePlayerMinimized: () => void; // Added to toggle minimized state
  setVolume: (volume: number) => void; // Added to control volume
  toggleMute: () => void; // Added to toggle mute state
}

// Initialize audio session
const initAudioSession = async () => {
  try {
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      console.log('Audio session initialized');
    }
  } catch (error) {
    console.error('Failed to set audio mode:', error);
  }
};

// Initialize audio session when the store is created
initAudioSession();

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  playbackState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLooping: false,
    playbackRate: 1.0,
    volume: 1.0, // Default to full volume
    isMuted: false, // Default to not muted
  },
  currentSongId: null,
  currentSetlistId: null,
  currentSongIndex: 0,
  sound: null,
  isSeekingInProgress: false, // Track if a seek operation is in progress
  isPlayerMinimized: false, // Default to expanded view
  
  setPlaybackState: (state) => {
    const { sound, playbackState, isSeekingInProgress } = get();
    
    // Handle play/pause state changes
    if (state.isPlaying !== undefined) {
      // On web, we can't actually play audio, so just show an alert
      if (Platform.OS === 'web' && state.isPlaying && !playbackState.isPlaying) {
        // Don't actually set isPlaying to true on web
        set(prev => ({ 
          playbackState: { ...prev.playbackState, isPlaying: false } 
        }));
        return;
      }
      
      // On native platforms, handle audio playback
      if (sound) {
        if (state.isPlaying && !playbackState.isPlaying) {
          console.log('Starting audio playback...');
          sound.playAsync().catch(error => {
            console.error('Error playing audio:', error);
            set(prev => ({ 
              playbackState: { ...prev.playbackState, isPlaying: false } 
            }));
          });
        } else if (!state.isPlaying && playbackState.isPlaying) {
          console.log('Pausing audio playback...');
          sound.pauseAsync().catch(error => {
            console.error('Error pausing audio:', error);
          });
        }
      } else {
        console.log('No sound object available, updating state only');
        // If no sound object, just update the state (for songs without audio)
        set(prev => ({ 
          playbackState: { ...prev.playbackState, isPlaying: state.isPlaying ?? prev.playbackState.isPlaying } 
        }));
        return;
      }
    }
    
    // Handle playback rate changes
    if (state.playbackRate !== undefined && sound && playbackState.playbackRate !== state.playbackRate) {
      sound.setRateAsync(state.playbackRate, true).catch(error => {
        console.error('Error setting playback rate:', error);
      });
    }
    
    // Handle seeking with improved error handling and state tracking
    if (state.currentTime !== undefined && sound && Math.abs(playbackState.currentTime - state.currentTime) > 1) {
      // Only attempt to seek if we're not already seeking
      if (!isSeekingInProgress) {
        set({ isSeekingInProgress: true });
        
        // Use async function for seeking to avoid Promise chain type issues
        const performSeek = async () => {
          try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              await sound.setPositionAsync(state.currentTime! * 1000);
            } else {
              console.log('Cannot seek: sound not loaded');
            }
          } catch (error) {
            console.error('Error seeking audio:', error);
          } finally {
            // Update state with new time and reset seeking flag
            set(prev => ({ 
              isSeekingInProgress: false,
              playbackState: { 
                ...prev.playbackState, 
                currentTime: state.currentTime !== undefined ? state.currentTime : prev.playbackState.currentTime 
              } 
            }));
          }
        };
        
        // Execute the seek operation
        performSeek();
        
        // Return early to avoid immediate state update
        return;
      }
    }
    
    // Handle loop mode
    if (state.isLooping !== undefined && sound && playbackState.isLooping !== state.isLooping) {
      sound.setIsLoopingAsync(state.isLooping).catch(error => {
        console.error('Error setting loop mode:', error);
      });
    }
    
    // Update state (except for seeking which is handled separately)
    set((prev) => ({ 
      playbackState: { ...prev.playbackState, ...state } 
    }));
  },
  
  setCurrentSong: async (songId, shouldPlay = false) => {
    const { unloadAudio, currentSongId, sound } = get();
    
    // If the same song is already loaded and we're trying to play it, just toggle playback
    if (songId === currentSongId && sound && shouldPlay) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          console.log('Song already playing, pausing...');
          await sound.pauseAsync();
          set(state => ({
            playbackState: { ...state.playbackState, isPlaying: false }
          }));
        } else {
          console.log('Song loaded but paused, resuming...');
          await sound.playAsync();
          set(state => ({
            playbackState: { ...state.playbackState, isPlaying: true }
          }));
        }
        return;
      }
    }
    
    // Unload current audio if any
    await unloadAudio();
    
    set({ 
      currentSongId: songId,
      currentSetlistId: null,
      currentSongIndex: 0,
      sound: null,
      isSeekingInProgress: false,
      playbackState: {
        ...get().playbackState,
        currentTime: 0,
        isPlaying: false,
      }
    });
    
    // Load audio if song has an audioUri
    if (songId) {
      const song = useSongStore.getState().songs[songId];
      if (song && song.audioUri && Platform.OS !== 'web') {
        console.log('Loading audio for song:', song.title, 'URI:', song.audioUri);
        await get().loadAndPlayAudio(song.audioUri, shouldPlay);
      } else {
        console.log('No audio URI for song or web platform:', song?.title);
        // If no audio or web platform, set a default duration
        set(state => ({
          playbackState: {
            ...state.playbackState,
            duration: song ? song.duration : 0,
            // On web or without audio, we can still simulate playback state
            isPlaying: shouldPlay && Platform.OS === 'web' ? false : shouldPlay
          }
        }));
      }
    }
  },
  
  setCurrentSetlist: async (setlistId, songIndex = 0, shouldPlay = false) => {
    const { unloadAudio } = get();
    
    // Unload current audio if any
    await unloadAudio();
    
    set({ 
      currentSetlistId: setlistId,
      currentSongIndex: songIndex,
      sound: null,
      isSeekingInProgress: false,
      playbackState: {
        ...get().playbackState,
        currentTime: 0,
        isPlaying: false,
      }
    });
    
    // Load audio for the current song in the setlist but don't auto-play
    if (setlistId) {
      const setlist = useSetlistStore.getState().setlists[setlistId];
      if (setlist && setlist.songs.length > songIndex) {
        const songId = setlist.songs[songIndex];
        set({ currentSongId: songId });
        
        const song = useSongStore.getState().songs[songId];
        if (song && song.audioUri && Platform.OS !== 'web') {
          console.log('Loading audio for setlist song:', song.title, 'URI:', song.audioUri);
          // Load the audio but don't auto-play
          try {
            // Create a status update callback that can be cleaned up
            const statusUpdateCallback = (status: any) => {
              if (!status.isLoaded) return;
              
              // Check if the sound is still the current one to prevent stale updates
              const currentSound = get().sound;
              if (!currentSound) return;
              
              // Update playback state based on status
              set(state => ({
                playbackState: {
                  ...state.playbackState,
                  isPlaying: status.isPlaying,
                  currentTime: status.positionMillis / 1000,
                  duration: status.isLoaded && status.durationMillis ? status.durationMillis / 1000 : state.playbackState.duration
                }
              }));
              
              // Handle playback completion
              if (status.didJustFinish && !status.isLooping) {
                console.log('Song finished playing, resetting position');
                const { currentSetlistId, currentSongIndex, sound } = get();
                
                // Always reset position to 0 when song finishes
                if (sound) {
                  sound.setPositionAsync(0).catch(error => {
                    console.error('Error resetting position:', error);
                  });
                }
                
                if (currentSetlistId) {
                  const setlist = useSetlistStore.getState().setlists[currentSetlistId];
                  if (setlist && currentSongIndex < setlist.songs.length - 1) {
                    // Auto-advance to next song in setlist
                    get().nextSong();
                  } else {
                    // End of setlist - reset to beginning
                    console.log('End of setlist - resetting to beginning');
                    set(state => ({
                      playbackState: {
                        ...state.playbackState,
                        isPlaying: false,
                        currentTime: 0
                      }
                    }));
                  }
                } else {
                  // Single song finished - reset to beginning
                  console.log('Single song finished - resetting to beginning');
                  set(state => ({
                    playbackState: {
                      ...state.playbackState,
                      isPlaying: false,
                      currentTime: 0
                    }
                  }));
                }
              }
            };
            
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: song.audioUri },
              { 
                shouldPlay: shouldPlay, // Control auto-play with parameter
                volume: get().playbackState.isMuted ? 0 : get().playbackState.volume, // Apply current volume settings
              }, 
              statusUpdateCallback
            );
            
            // Get initial status
            const initialStatus = await newSound.getStatusAsync();
            let duration = song.duration;
            
            if (initialStatus.isLoaded && initialStatus.durationMillis) {
              duration = initialStatus.durationMillis / 1000;
            }
            
            set({
              sound: newSound,
              playbackState: {
                ...get().playbackState,
                duration: duration,
                currentTime: 0,
                isPlaying: shouldPlay // Set isPlaying based on shouldPlay parameter
              }
            });
          } catch (err) {
            console.error("Error loading audio:", err);
          }
        } else {
          console.log('No audio URI for setlist song or web platform:', song?.title);
          // If no audio or web platform, set a default duration
          set(state => ({
            playbackState: {
              ...state.playbackState,
              duration: song ? song.duration : 0,
              // On web, don't set isPlaying to true since we can't actually play
              isPlaying: shouldPlay && Platform.OS !== 'web' ? shouldPlay : false
            }
          }));
        }
      }
    }
  },
  
  nextSong: async () => {
    const { currentSetlistId, currentSongIndex, unloadAudio } = get();
    
    if (!currentSetlistId) return;
    
    const setlist = useSetlistStore.getState().setlists[currentSetlistId];
    if (!setlist) return;
    
    const nextIndex = currentSongIndex + 1;
    if (nextIndex >= setlist.songs.length) return;
    
    // Unload current audio if any
    await unloadAudio();
    
    set({
      currentSongIndex: nextIndex,
      currentSongId: setlist.songs[nextIndex],
      sound: null,
      isSeekingInProgress: false,
      playbackState: {
        ...get().playbackState,
        currentTime: 0,
        isPlaying: false,
      }
    });
    
    // Load audio for the next song
    const nextSong = useSongStore.getState().songs[setlist.songs[nextIndex]];
    if (nextSong && nextSong.audioUri) {
      console.log('Loading audio for next song:', nextSong.title);
      get().loadAndPlayAudio(nextSong.audioUri, get().playbackState.isPlaying);
    } else {
      console.log('No audio URI for next song:', nextSong?.title);
      // If no audio, set a default duration
      set(state => ({
        playbackState: {
          ...state.playbackState,
          duration: nextSong ? nextSong.duration : 0
        }
      }));
    }
  },
  
  previousSong: async () => {
    const { currentSetlistId, currentSongIndex, unloadAudio } = get();
    
    if (!currentSetlistId) return;
    
    const setlist = useSetlistStore.getState().setlists[currentSetlistId];
    if (!setlist) return;
    
    const prevIndex = Math.max(0, currentSongIndex - 1);
    if (prevIndex === currentSongIndex) return;
    
    // Unload current audio if any
    await unloadAudio();
    
    set({
      currentSongIndex: prevIndex,
      currentSongId: setlist.songs[prevIndex],
      sound: null,
      isSeekingInProgress: false,
      playbackState: {
        ...get().playbackState,
        currentTime: 0,
        isPlaying: false,
      }
    });
    
    // Load audio for the previous song
    const prevSong = useSongStore.getState().songs[setlist.songs[prevIndex]];
    if (prevSong && prevSong.audioUri) {
      console.log('Loading audio for previous song:', prevSong.title);
      get().loadAndPlayAudio(prevSong.audioUri, get().playbackState.isPlaying);
    } else {
      console.log('No audio URI for previous song:', prevSong?.title);
      // If no audio, set a default duration
      set(state => ({
        playbackState: {
          ...state.playbackState,
          duration: prevSong ? prevSong.duration : 0
        }
      }));
    }
  },
  
  loadAndPlayAudio: async (uri, shouldPlay = false) => {
    try {
      // Skip audio loading on web platform
      if (Platform.OS === 'web') {
        console.log('Audio playback not supported on web');
        return;
      }
      
      console.log('Loading audio from URI:', uri, 'shouldPlay:', shouldPlay);
      
      // Unload any existing sound
      const { sound: existingSound } = get();
      if (existingSound) {
        try {
          await existingSound.unloadAsync();
        } catch (unloadError) {
          console.error('Error unloading existing sound:', unloadError);
        }
      }
      
      // Reset seeking state
      set({ isSeekingInProgress: false });
      
      // Get current volume settings
      const { volume, isMuted } = get().playbackState;
      
      // Validate audio file exists before loading
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          console.error('Audio file does not exist:', uri);
          // Try to clear the invalid audio URI from the song
          const { currentSongId } = get();
          if (currentSongId) {
            const song = useSongStore.getState().songs[currentSongId];
            if (song) {
              // Clear the invalid audio URI
              useSongStore.getState().updateSong(currentSongId, { 
                ...song, 
                audioUri: undefined,
                audioFileName: undefined 
              });
            }
          }
          throw new Error('Audio file not found. Please re-import the audio file.');
        }
        
        // Check file size - very small files might be corrupted
        if (fileInfo.size && fileInfo.size < 1000) {
          console.error('Audio file too small, might be corrupted:', fileInfo.size, 'bytes');
          throw new Error('Audio file appears to be corrupted. Please re-import the audio.');
        }
      } catch (fileError: any) {
        console.error('Error checking audio file:', fileError);
        // If it's our custom error, re-throw it
        if (fileError.message?.includes('Audio file')) {
          throw fileError;
        }
        // Otherwise, throw a generic error
        throw new Error('Cannot access audio file. Please re-import the audio.');
      }
      
      // Create a status update callback that can be cleaned up
      const statusUpdateCallback = (status: any) => {
        if (!status.isLoaded) {
          console.log('Audio status not loaded:', status);
          return;
        }
        
        // Check if the sound is still the current one to prevent stale updates
        const currentSound = get().sound;
        if (!currentSound) return;
        
        console.log('Audio status update:', 
          status.isPlaying ? 'playing' : 'paused', 
          'position:', status.positionMillis / 1000,
          'duration:', status.durationMillis ? status.durationMillis / 1000 : 'unknown'
        );
        
        // Update playback state based on status
        set(state => ({
          playbackState: {
            ...state.playbackState,
            isPlaying: status.isPlaying,
            currentTime: status.positionMillis / 1000,
            duration: status.isLoaded && status.durationMillis ? status.durationMillis / 1000 : state.playbackState.duration
          }
        }));
        
        // Handle playback completion
        if (status.didJustFinish && !status.isLooping) {
          console.log('Song finished playing in loadAndPlayAudio, resetting position');
          const { currentSetlistId, currentSongIndex, sound } = get();
          
          // Always reset position to 0 when song finishes
          if (sound) {
            sound.setPositionAsync(0).catch(error => {
              console.error('Error resetting position:', error);
            });
          }
          
          if (currentSetlistId) {
            const setlist = useSetlistStore.getState().setlists[currentSetlistId];
            if (setlist && currentSongIndex < setlist.songs.length - 1) {
              // Auto-advance to next song in setlist
              get().nextSong();
            } else {
              // End of setlist or single song - reset to beginning
              console.log('Song finished - resetting to beginning');
              set(state => ({
                playbackState: {
                  ...state.playbackState,
                  isPlaying: false,
                  currentTime: 0
                }
              }));
            }
          } else {
            // Single song finished - reset to beginning
            console.log('Single song finished - resetting to beginning');
            set(state => ({
              playbackState: {
                ...state.playbackState,
                isPlaying: false,
                currentTime: 0
              }
            }));
          }
        }
      };
      
      // Load the audio file with error handling
      let newSound: Audio.Sound | null = null;
      
      try {
        const result = await Audio.Sound.createAsync(
          { uri },
          { 
            shouldPlay: shouldPlay, // Control auto-play with parameter
            rate: get().playbackState.playbackRate,
            isLooping: get().playbackState.isLooping,
            volume: isMuted ? 0 : volume, // Apply current volume settings
            progressUpdateIntervalMillis: 500, // Update progress every 500ms
          },
          statusUpdateCallback,
          false // downloadFirst = false for local files
        );
        newSound = result.sound;
      } catch (loadError: any) {
        console.error('Error creating audio sound:', loadError);
        
        // Parse specific error codes
        if (loadError.message?.includes('-11800') || loadError.message?.includes('-11819') || loadError.message?.includes('AVFoundationErrorDomain')) {
          // Clear the invalid audio URI from the song
          const { currentSongId } = get();
          if (currentSongId) {
            const song = useSongStore.getState().songs[currentSongId];
            if (song) {
              useSongStore.getState().updateSong(currentSongId, { 
                ...song, 
                audioUri: undefined,
                audioFileName: undefined 
              });
            }
          }
          throw new Error('Audio format not supported. Please use MP3, M4A, or WAV files.');
        } else if (loadError.message?.includes('-17913') || loadError.message?.includes('unknown error')) {
          // Clear the invalid audio URI from the song
          const { currentSongId } = get();
          if (currentSongId) {
            const song = useSongStore.getState().songs[currentSongId];
            if (song) {
              useSongStore.getState().updateSong(currentSongId, { 
                ...song, 
                audioUri: undefined,
                audioFileName: undefined 
              });
            }
          }
          throw new Error('Audio file is corrupted or incompatible. Please re-import the audio.');
        } else {
          throw new Error('Failed to load audio. Please check the file format and try again.');
        }
      }
      
      if (!newSound) {
        throw new Error('Failed to create audio player.');
      }
      
      console.log('Audio loaded successfully, shouldPlay:', shouldPlay);
      
      // Get initial status with error handling
      let duration = get().playbackState.duration;
      let actuallyPlaying = false;
      
      try {
        const initialStatus = await newSound.getStatusAsync();
        
        if (initialStatus.isLoaded) {
          if (initialStatus.durationMillis) {
            duration = initialStatus.durationMillis / 1000;
            console.log('Initial audio duration:', duration);
          }
          actuallyPlaying = initialStatus.isPlaying;
        } else {
          console.warn('Audio loaded but status indicates not loaded');
        }
      } catch (statusError) {
        console.error('Error getting initial audio status:', statusError);
      }
      
      set({
        sound: newSound,
        playbackState: {
          ...get().playbackState,
          duration: duration,
          currentTime: 0,
          isPlaying: actuallyPlaying // Use actual playing state
        }
      });
      
    } catch (error: any) {
      console.error('Error loading audio:', error);
      
      // Clean up any partially loaded sound
      const { sound } = get();
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (cleanupError) {
          console.error('Error cleaning up failed audio load:', cleanupError);
        }
      }
      
      // Reset playback state on error
      set(state => ({
        sound: null,
        playbackState: {
          ...state.playbackState,
          isPlaying: false,
          currentTime: 0
        }
      }));
      
      // Re-throw with user-friendly message if not already formatted
      if (error.message?.startsWith('Audio') || error.message?.startsWith('Cannot') || error.message?.startsWith('Failed')) {
        throw error;
      } else {
        throw new Error('Unable to play this audio file. Please try a different format (MP3, M4A, or WAV).');
      }
    }
  },
  
  unloadAudio: async () => {
    const { sound } = get();
    if (sound) {
      try {
        // First pause the sound to stop playback
        await sound.pauseAsync().catch(err => console.error("Error pausing audio:", err));
        
        // Remove status update callback to prevent memory leaks
        await sound.setOnPlaybackStatusUpdate(null);
        
        // Then unload it
        await sound.unloadAsync();
        console.log('Audio unloaded successfully');
      } catch (error) {
        console.error('Error unloading audio:', error);
      }
      
      // Reset sound and seeking state
      set({ 
        sound: null, 
        isSeekingInProgress: false,
        playbackState: {
          ...get().playbackState,
          isPlaying: false
        }
      });
    }
    return;
  },
  
  updatePlaybackStatus: async () => {
    const { sound, isSeekingInProgress } = get();
    if (!sound || isSeekingInProgress) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            isPlaying: status.isPlaying,
            currentTime: status.positionMillis / 1000,
            duration: status.durationMillis ? status.durationMillis / 1000 : state.playbackState.duration
          }
        }));
      }
    } catch (error) {
      console.error('Error updating playback status:', error);
      // If there's an error with the sound, clean up the state
      set(state => ({
        sound: null,
        playbackState: {
          ...state.playbackState,
          isPlaying: false
        }
      }));
    }
  },
  
  togglePlayerMinimized: () => {
    set(state => ({
      isPlayerMinimized: !state.isPlayerMinimized
    }));
  },
  
  // Volume control methods (kept for other screens that might use them)
  setVolume: (volume) => {
    const { sound, playbackState } = get();
    const newVolume = Math.max(0, Math.min(1, volume)); // Ensure volume is between 0 and 1
    
    // Only update if the volume has actually changed
    if (newVolume === playbackState.volume) {
      return;
    }
    
    // Update the sound volume if it exists
    if (sound) {
      try {
        // Apply volume based on mute state
        const effectiveVolume = playbackState.isMuted ? 0 : newVolume;
        sound.setVolumeAsync(effectiveVolume).catch(error => {
          console.error('Error setting volume:', error);
        });
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
    
    // Update the state
    set(state => ({
      playbackState: {
        ...state.playbackState,
        volume: newVolume
      }
    }));
  },
  
  toggleMute: () => {
    const { sound, playbackState } = get();
    const newMuteState = !playbackState.isMuted;
    
    // Update the sound volume if it exists
    if (sound) {
      try {
        // Set volume to 0 if muting, or to stored volume if unmuting
        const effectiveVolume = newMuteState ? 0 : playbackState.volume;
        sound.setVolumeAsync(effectiveVolume).catch(error => {
          console.error('Error toggling mute:', error);
        });
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
    
    // Update the state
    set(state => ({
      playbackState: {
        ...state.playbackState,
        isMuted: newMuteState
      }
    }));
  }
}));