import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, GestureResponderEvent, LayoutChangeEvent, Animated } from 'react-native';
import { Play, Pause, SkipBack, SkipForward, Repeat, Music2, ChevronUp, ChevronDown } from 'lucide-react-native';
import { usePlayerStore } from '@/store/playerStore';
import { formatDuration } from '@/utils/timeUtils';
import { useSongStore } from '@/store/songStore';
import { useTheme } from '@/context/ThemeContext';
import { throttle } from '@/utils/memoryUtils';

export default function PlayerControls() {
  const { 
    playbackState, 
    currentSongId, 
    setPlaybackState, 
    nextSong, 
    previousSong, 
    updatePlaybackStatus,
    isPlayerMinimized,
    togglePlayerMinimized,
  } = usePlayerStore();
  
  const { songs } = useSongStore();
  const { colors } = useTheme();
  const [progressWidth, setProgressWidth] = useState('0%');
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);
  const heightAnim = useRef(new Animated.Value(isPlayerMinimized ? 0 : 1)).current;

  const currentSong = currentSongId ? songs[currentSongId] : null;
  const { isPlaying, currentTime, duration, isLooping } = playbackState;

  // Throttled update function to prevent excessive calls
  const throttledUpdateStatus = useRef(
    throttle(() => {
      if (currentSongId && songs[currentSongId]) {
        updatePlaybackStatus();
      }
    }, 1000)
  ).current;

  // Update progress periodically when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isPlaying && !isScrubbing && currentSong) {
      interval = setInterval(() => {
        throttledUpdateStatus();
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [isPlaying, isScrubbing, currentSong, currentSongId, songs, throttledUpdateStatus]);

  // Calculate progress width
  useEffect(() => {
    if (duration > 0 && !isScrubbing) {
      const percentage = Math.min(100, (currentTime / duration) * 100);
      setProgressWidth(`${percentage}%`);
    } else {
      setProgressWidth('0%');
    }
  }, [currentTime, duration, isScrubbing]);

  // Animate height changes when minimized state changes
  useEffect(() => {
    const animation = Animated.timing(heightAnim, {
      toValue: isPlayerMinimized ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    });
    
    animation.start();
    
    // Cleanup function to stop animation if component unmounts
    return () => {
      animation.stop();
    };
  }, [isPlayerMinimized, heightAnim]);

  const togglePlayPause = async () => {
    console.log('Toggle play/pause - Current state:', isPlaying, 'Current song:', currentSong?.title, 'Has audio:', !!currentSong?.audioUri);
    
    if (Platform.OS === 'web') {
      Alert.alert("Not Available", "Audio playback is not available on web.");
      return;
    }
    
    if (!currentSong) {
      Alert.alert("No Song", "Please select a song first.");
      return;
    }
    
    // Allow play/pause even without audio (for songs without audio files)
    if (!currentSong.audioUri) {
      console.log('No audio file, but allowing play/pause for visual feedback');
      setPlaybackState({ isPlaying: !isPlaying });
      return;
    }
    
    try {
      console.log('Calling setPlaybackState with isPlaying:', !isPlaying);
      setPlaybackState({ isPlaying: !isPlaying });
    } catch (error: any) {
      console.error('Error toggling playback:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = "The audio file appears to be corrupted or missing.";
      let errorTitle = "Audio Error";
      
      if (error.message?.includes('Audio format not supported')) {
        errorTitle = "Unsupported Format";
        errorMessage = "This audio format is not supported. Please use MP3, M4A, or WAV files.";
      } else if (error.message?.includes('Audio file not found')) {
        errorTitle = "File Not Found";
        errorMessage = "The audio file could not be found. Please re-import the audio.";
      } else if (error.message?.includes('corrupted')) {
        errorTitle = "Corrupted File";
        errorMessage = "The audio file appears to be corrupted. Please re-import a valid audio file.";
      }
      
      Alert.alert(
        errorTitle, 
        errorMessage,
        [
          { 
            text: "OK", 
            style: "default",
            onPress: () => {
              // Reset playback state on error
              setPlaybackState({ isPlaying: false });
            }
          }
        ]
      );
    }
  };

  const toggleLoop = () => {
    setPlaybackState({ isLooping: !isLooping });
  };
  
  // Handle progress bar layout to get its width
  const handleProgressBarLayout = (event: LayoutChangeEvent) => {
    progressBarWidth.current = event.nativeEvent.layout.width;
  };
  
  // Handle touch on progress bar
  const handleProgressBarTouch = (event: GestureResponderEvent) => {
    if (!progressBarRef.current || duration <= 0) return;
    
    const touchX = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, touchX / progressBarWidth.current));
    const newTime = percentage * duration;
    
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

  if (!currentSong) {
    return null;
  }

  const hasAudio = Platform.OS !== 'web' && currentSong.audioUri;

  // Interpolate height for animation
  const containerHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [72, 180], // Minimized height vs full height
  });

  // Render minimized player
  if (isPlayerMinimized) {
    return (
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: colors.surface, 
            borderTopColor: colors.border,
            height: containerHeight,
          }
        ]}
      >
        <View 
          ref={progressBarRef}
          style={styles.progressBarMini}
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
        </View>
        
        <View style={styles.miniPlayerContent}>
          <View style={styles.miniSongInfo}>
            <View style={styles.iconContainer}>
              <Music2 size={20} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.miniTitle, { color: colors.text }]} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={[styles.miniArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </View>
          </View>
          
          <View style={styles.miniControls}>
            <Pressable 
              style={[styles.miniPlayButton, { backgroundColor: colors.secondary }]} 
              onPress={togglePlayPause}
            >
              {isPlaying ? (
                <Pause size={20} color="#ffffff" />
              ) : (
                <Play size={20} color="#ffffff" />
              )}
            </Pressable>
            
            <Pressable style={styles.miniControlButton} onPress={togglePlayerMinimized}>
              <ChevronUp size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Render full player
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.surface, 
          borderTopColor: colors.border,
          height: containerHeight,
        }
      ]}
    >
      <View 
        ref={progressBarRef}
        style={styles.progressBar}
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
      
      <View style={styles.headerRow}>
        <View style={styles.songInfo}>
          <View style={styles.iconContainer}>
            <Music2 size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
        </View>
        
        <Pressable 
          style={styles.minimizeButton} 
          onPress={togglePlayerMinimized}
        >
          <ChevronDown size={24} color={colors.text} />
        </Pressable>
      </View>
      
      <View style={styles.timeInfo}>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatDuration(currentTime)}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatDuration(duration)}
        </Text>
      </View>
      
      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={previousSong}>
          <SkipBack size={24} color={colors.text} />
        </Pressable>
        
        <Pressable 
          style={[styles.playButton, { backgroundColor: colors.secondary }]} 
          onPress={togglePlayPause}
        >
          {isPlaying ? (
            <Pause size={28} color="#ffffff" />
          ) : (
            <Play size={28} color="#ffffff" />
          )}
        </Pressable>
        
        <Pressable style={styles.controlButton} onPress={nextSong}>
          <SkipForward size={24} color={colors.text} />
        </Pressable>
        
        <Pressable 
          style={styles.controlButton} 
          onPress={toggleLoop}
        >
          <Repeat 
            size={24} 
            color={isLooping ? colors.primary : colors.text} 
          />
        </Pressable>
      </View>
      
      {Platform.OS === 'web' && (
        <Text style={[styles.webNotice, { color: colors.textSecondary }]}>
          {hasAudio ? "Audio playback not available on web" : "No audio file attached"}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 12,
    position: 'relative',
  },
  progressBarMini: {
    height: 3,
    backgroundColor: '#333',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 14,
  },
  minimizeButton: {
    padding: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  time: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  webNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Mini player styles
  miniPlayerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    height: 60,
  },
  miniSongInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniArtist: {
    fontSize: 12,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniControlButton: {
    padding: 8,
  },
  miniPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});