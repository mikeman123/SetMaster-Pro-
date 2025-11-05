import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Alert, Modal, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, ChevronLeft, ChevronRight, Expand, Minimize, Play, Pause, RotateCcw, AlignStartVertical, Clock, Volume2, VolumeX, Volume1, Volume } from 'lucide-react-native';
import CustomSlider from '@/components/CustomSlider';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import colors from '@/constants/colors';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { usePlayerStore } from '@/store/playerStore';
import LyricsDisplay from '@/components/LyricsDisplay';
import { formatDuration } from '@/utils/timeUtils';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeContext';
import { usePerformanceKeepAwake } from '@/utils/keepAwakeUtils';

export default function LiveModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setlists } = useSetlistStore();
  const { songs } = useSongStore();
  const { 
    playbackState, 
    setPlaybackState, 
    currentSongIndex, 
    setCurrentSetlist, 
    nextSong, 
    previousSong, 
    updatePlaybackStatus, 
    unloadAudio,
    setVolume,
    toggleMute
  } = usePlayerStore();
  const { colors, isDark } = useTheme();
  
  // Keep screen awake during live performance
  usePerformanceKeepAwake();
  
  const [fullscreenLyrics, setFullscreenLyrics] = useState(false);
  const [progressWidth, setProgressWidth] = useState('0%');
  const [scrollStartLine, setScrollStartLine] = useState(0);
  const [showScrollSelector, setShowScrollSelector] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [localVolume, setLocalVolume] = useState(playbackState.volume);
  
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);
  
  const setlist = setlists[id];
  
  // Update local volume when playback state changes
  useEffect(() => {
    setLocalVolume(playbackState.volume);
  }, [playbackState.volume]);
  
  useEffect(() => {
    // First unload any existing audio to prevent duplication
    const setupAudio = async () => {
      await unloadAudio();
      
      // Set the current setlist when the component mounts
      // But don't auto-play
      setCurrentSetlist(id, 0, false);
      
      // Ensure playback is stopped initially
      setPlaybackState({ isPlaying: false });
    };
    
    setupAudio();
    
    // Cleanup when unmounting
    return () => {
      setPlaybackState({ isPlaying: false });
      unloadAudio();
    };
  }, [id]);
  
  // Update progress periodically when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (playbackState.isPlaying && !isScrubbing) {
      interval = setInterval(() => {
        updatePlaybackStatus();
      }, 500) as any;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playbackState.isPlaying, updatePlaybackStatus, isScrubbing]);

  // Calculate progress width
  useEffect(() => {
    if (playbackState.duration > 0 && !isScrubbing) {
      const percentage = Math.min(100, (playbackState.currentTime / playbackState.duration) * 100);
      setProgressWidth(`${percentage}%`);
    }
  }, [playbackState.currentTime, playbackState.duration, isScrubbing]);
  
  if (!setlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Setlist not found</Text>
        <Pressable 
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }
  
  const currentSongId = setlist.songs[currentSongIndex];
  const currentSong = songs[currentSongId];
  
  const handleTogglePlay = () => {
    if (Platform.OS === 'web' && currentSong?.audioUri) {
      Alert.alert("Not Available", "Audio playback is not available on web.");
      return;
    }
    setPlaybackState({ isPlaying: !playbackState.isPlaying });
  };
  
  const handleToggleFullscreen = () => {
    setFullscreenLyrics(!fullscreenLyrics);
  };
  
  const handleExit = async () => {
    // Make sure to unload audio before exiting
    await unloadAudio();
    router.back();
  };
  
  const handleRestart = () => {
    setPlaybackState({ currentTime: 0 });
    // If it's not playing, start playing
    if (!playbackState.isPlaying) {
      setPlaybackState({ isPlaying: true });
    }
  };

  const handleSetScrollStart = () => {
    setShowScrollSelector(true);
  };

  const handleLineSelected = (lineIndex: number) => {
    setScrollStartLine(lineIndex);
    setShowScrollSelector(false);
  };
  
  const handleToggleVolumeControls = () => {
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Volume control is not available on web.");
      return;
    }
    setShowVolumeControls(!showVolumeControls);
  };
  
  // Handle volume change with local state to prevent infinite loops
  const handleVolumeChange = (value: number) => {
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Volume control is not available on web.");
      return;
    }
    
    // Update local state immediately for smooth UI
    setLocalVolume(value);
  };
  
  // Only update the actual volume when the slider is released
  const handleVolumeComplete = () => {
    if (Platform.OS === 'web') return;
    
    // Apply the volume change
    setVolume(localVolume);
    
    // Handle mute state based on volume
    if (localVolume === 0 && !playbackState.isMuted) {
      toggleMute();
    } else if (localVolume > 0 && playbackState.isMuted) {
      toggleMute();
    }
  };
  
  const handleToggleMute = () => {
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Volume control is not available on web.");
      return;
    }
    toggleMute();
  };
  
  // Handle progress bar layout to get its width
  const handleProgressBarLayout = (event: LayoutChangeEvent) => {
    progressBarWidth.current = event.nativeEvent.layout.width;
  };
  
  // Handle touch on progress bar
  const handleProgressBarTouch = (event: GestureResponderEvent) => {
    if (!progressBarRef.current || playbackState.duration <= 0) return;
    
    const touchX = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, touchX / progressBarWidth.current));
    const newTime = percentage * playbackState.duration;
    
    // Update progress bar immediately for visual feedback
    setIsScrubbing(true);
    setProgressWidth(`${percentage * 100}%`);
    
    // Update playback position
    setPlaybackState({ currentTime: newTime });
  };
  
  // Handle touch end on progress bar
  const handleProgressBarTouchEnd = () => {
    setIsScrubbing(false);
  };
  
  // Get the appropriate volume icon based on volume level and mute state
  const getVolumeIcon = () => {
    if (playbackState.isMuted || playbackState.volume === 0) {
      return <VolumeX size={24} color={colors.text} />;
    } else if (playbackState.volume < 0.3) {
      return <Volume size={24} color={colors.text} />;
    } else if (playbackState.volume < 0.7) {
      return <Volume1 size={24} color={colors.text} />;
    } else {
      return <Volume2 size={24} color={colors.text} />;
    }
  };
  
  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>No songs in this setlist</Text>
        <Pressable 
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }
  
  const hasAudio = Platform.OS !== 'web' && currentSong.audioUri;
  const lines = currentSong.lyrics ? currentSong.lyrics.split('\n') : [];
  const lyricsStartTime = currentSong.lyricsStartTime || 0;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar hidden />
      
      {!fullscreenLyrics && (
        <View style={styles.header}>
          <Pressable 
            style={styles.exitButton}
            onPress={handleExit}
          >
            <X size={24} color={colors.text} />
          </Pressable>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.setlistName, { color: colors.text }]}>{setlist.name}</Text>
            <Text style={[styles.songCounter, { color: colors.textSecondary }]}>
              {currentSongIndex + 1} of {setlist.songs.length}
            </Text>
          </View>
          
          <Pressable 
            style={styles.fullscreenButton}
            onPress={handleToggleFullscreen}
          >
            <Expand size={24} color={colors.text} />
          </Pressable>
        </View>
      )}
      
      {fullscreenLyrics ? (
        <View style={styles.fullscreenContainer}>
          <LyricsDisplay 
            lyrics={currentSong.lyrics} 
            chords={currentSong.chords} 
            fullScreen 
            initialScrollPosition={scrollStartLine}
            lyricsStartTime={lyricsStartTime}
          />
          
          <Pressable 
            style={[styles.minimizeButton, { backgroundColor: colors.surface }]}
            onPress={handleToggleFullscreen}
          >
            <Minimize size={24} color={colors.text} />
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.songInfo}>
            <Text style={[styles.songTitle, { color: colors.text }]}>{currentSong.title}</Text>
            <Text style={[styles.songArtist, { color: colors.textSecondary }]}>{currentSong.artist}</Text>
            
            <View style={styles.songDetails}>
              <Text style={[styles.songKey, { color: colors.textSecondary }]}>Key: {currentSong.key}</Text>
              <Text style={[styles.songTempo, { color: colors.textSecondary }]}>{currentSong.tempo} BPM</Text>
              {hasAudio && (
                <Text style={[styles.audioIndicator, { color: colors.primary }]}>Audio Available</Text>
              )}
              {lyricsStartTime > 0 && (
                <View style={styles.lyricsStartTimeContainer}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={[styles.lyricsStartTime, { color: colors.primary }]}>
                    Lyrics at {formatDuration(lyricsStartTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.lyricsContainer}>
            <LyricsDisplay 
              lyrics={currentSong.lyrics} 
              chords={currentSong.chords} 
              initialScrollPosition={scrollStartLine}
              lyricsStartTime={lyricsStartTime}
            />
          </View>
          
          <View style={styles.controls}>
            <View 
              ref={progressBarRef}
              style={[styles.progressBar, { backgroundColor: colors.surface }]}
              onLayout={handleProgressBarLayout}
              onTouchStart={handleProgressBarTouch}
              onTouchMove={handleProgressBarTouch}
              onTouchEnd={handleProgressBarTouchEnd}
            >
              <View
                style={[
                  styles.progress,
                  {
                    backgroundColor: colors.primary,
                    width: progressWidth as any
                  }
                ]}
              />
              <View style={styles.progressBarTouchArea} />
            </View>
            
            <View style={styles.timeInfo}>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatDuration(playbackState.currentTime)}
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatDuration(playbackState.duration)}
              </Text>
            </View>
            
            {showVolumeControls && (
              <View style={styles.volumeControls}>
                <Pressable 
                  style={styles.muteButton} 
                  onPress={handleToggleMute}
                >
                  {getVolumeIcon()}
                </Pressable>
                
                <CustomSlider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={localVolume}
                  onValueChange={handleVolumeChange}
                  onSlidingComplete={handleVolumeComplete}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
                
                <Text style={[styles.volumeText, { color: colors.textSecondary }]}>
                  {Math.round(localVolume * 100)}%
                </Text>
              </View>
            )}
            
            <View style={styles.controlButtons}>
              <Pressable 
                style={styles.controlButton}
                onPress={previousSong}
                disabled={currentSongIndex === 0}
              >
                <ChevronLeft 
                  size={32} 
                  color={currentSongIndex === 0 ? colors.textSecondary : colors.text} 
                />
              </Pressable>
              
              <Pressable 
                style={styles.controlButton}
                onPress={handleRestart}
              >
                <RotateCcw size={24} color={colors.text} />
              </Pressable>
              
              <Pressable 
                style={[styles.playButton, { backgroundColor: colors.secondary }]}
                onPress={handleTogglePlay}
              >
                {playbackState.isPlaying ? (
                  <Pause size={36} color="#ffffff" />
                ) : (
                  <Play size={36} color="#ffffff" />
                )}
              </Pressable>
              
              <Pressable 
                style={styles.controlButton}
                onPress={handleSetScrollStart}
              >
                <AlignStartVertical size={24} color={colors.text} />
              </Pressable>
              
              <Pressable 
                style={styles.controlButton}
                onPress={handleToggleVolumeControls}
              >
                {getVolumeIcon()}
              </Pressable>
              
              <Pressable 
                style={styles.controlButton}
                onPress={nextSong}
                disabled={currentSongIndex === setlist.songs.length - 1}
              >
                <ChevronRight 
                  size={32} 
                  color={currentSongIndex === setlist.songs.length - 1 ? colors.textSecondary : colors.text} 
                />
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Scroll Start Line Selector Modal */}
      <Modal
        visible={showScrollSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScrollSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Scroll Start Line</Text>
              <Pressable 
                style={styles.modalCloseButton}
                onPress={() => setShowScrollSelector(false)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.lineSelector}>
              {lines.map((line, index) => (
                <Pressable 
                  key={index}
                  style={[
                    styles.lineItem,
                    { borderBottomColor: colors.border },
                    scrollStartLine === index && [styles.selectedLineItem, { backgroundColor: `${colors.primary}33` }]
                  ]}
                  onPress={() => handleLineSelected(index)}
                >
                  <Text style={[styles.lineNumber, { color: colors.textSecondary }]}>Line {index + 1}</Text>
                  <Text 
                    style={[
                      styles.lineText,
                      { color: colors.text },
                      scrollStartLine === index && styles.selectedLineText
                    ]}
                    numberOfLines={1}
                  >
                    {line.trim() || "(Empty line)"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  exitButton: {
    padding: 8,
  },
  headerInfo: {
    alignItems: 'center',
  },
  setlistName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  songCounter: {
    fontSize: 12,
  },
  fullscreenButton: {
    padding: 8,
  },
  songInfo: {
    padding: 16,
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  songArtist: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  songDetails: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  songKey: {
    fontSize: 14,
  },
  songTempo: {
    fontSize: 14,
  },
  audioIndicator: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lyricsStartTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lyricsStartTime: {
    fontSize: 14,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  controls: {
    padding: 16,
    paddingBottom: 40,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    position: 'relative',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarTouchArea: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    bottom: -10,
    backgroundColor: 'transparent',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  muteButton: {
    padding: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  volumeText: {
    width: 40,
    fontSize: 12,
    textAlign: 'right',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  fullscreenContainer: {
    flex: 1,
    position: 'relative',
  },
  minimizeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    padding: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  modalCloseButton: {
    padding: 4,
  },
  lineSelector: {
    maxHeight: 400,
  },
  lineItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectedLineItem: {
    // Background color with transparency is added in the component
  },
  lineNumber: {
    width: 60,
    fontSize: 14,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
  },
  selectedLineText: {
    fontWeight: 'bold',
  },
});