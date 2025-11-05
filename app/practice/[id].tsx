import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, Modal, GestureResponderEvent, LayoutChangeEvent, ScrollView, PanResponder, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomSlider from '@/components/CustomSlider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, ChevronLeft, ChevronRight, Play, Pause, Repeat, RotateCcw, AlignStartVertical, Clock, Volume2, VolumeX, Volume1, Volume, Target, FileText, Maximize2, Minimize2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '@/constants/colors';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { usePlayerStore } from '@/store/playerStore';
import { useRehearsalStore } from '@/store/rehearsalStore';

import LyricsDisplay from '@/components/LyricsDisplay';
import { formatDuration } from '@/utils/timeUtils';
import { useTheme } from '@/context/ThemeContext';
import { usePerformanceKeepAwake } from '@/utils/keepAwakeUtils';

export default function PracticeModeScreen() {
  const { id, isSong } = useLocalSearchParams<{ id: string, isSong?: string }>();
  const router = useRouter();
  const { setlists } = useSetlistStore();
  const { songs } = useSongStore();
  const { 
    playbackState, 
    setPlaybackState, 
    currentSongIndex, 
    setCurrentSetlist, 
    setCurrentSong, 
    nextSong, 
    previousSong, 
    updatePlaybackStatus, 
    unloadAudio,
    setVolume,
    toggleMute
  } = usePlayerStore();
  const { colors, isDark } = useTheme();
  const { 
    getActiveSession, 
    nextSessionSong, 
    previousSessionSong, 
    getCurrentSessionSong, 
    getSessionSongIndex, 
    getTotalSessionSongs,
    stopSession,
    completeSession 
  } = useRehearsalStore();

  
  const activeSession = getActiveSession();
  
  // Keep screen awake during practice
  usePerformanceKeepAwake();
  

  
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [progressWidth, setProgressWidth] = useState('0%');
  const [scrollStartLine, setScrollStartLine] = useState(0);
  const [showScrollSelector, setShowScrollSelector] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [localVolume, setLocalVolume] = useState(playbackState.volume);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [isLyricsFullscreen, setIsLyricsFullscreen] = useState(false);
  
  // Draggable session button state
  const [sessionButtonPosition] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);
  
  // Session button drag handler
  const sessionButtonPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        sessionButtonPosition.setOffset({
          x: (sessionButtonPosition.x as any)._value,
          y: (sessionButtonPosition.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: sessionButtonPosition.x, dy: sessionButtonPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        sessionButtonPosition.flattenOffset();
        
        // Keep button within screen bounds
        const currentX = (sessionButtonPosition.x as any)._value;
        const currentY = (sessionButtonPosition.y as any)._value;
        const buttonSize = 40; // Button width/height
        const padding = 10; // Minimum distance from edge
        
        let newX = currentX;
        let newY = currentY;
        
        // Constrain X position
        if (currentX < -screenDimensions.width / 2 + buttonSize + padding) {
          newX = -screenDimensions.width / 2 + buttonSize + padding;
        } else if (currentX > screenDimensions.width / 2 - buttonSize - padding) {
          newX = screenDimensions.width / 2 - buttonSize - padding;
        }
        
        // Constrain Y position
        if (currentY < -screenDimensions.height / 2 + buttonSize + padding) {
          newY = -screenDimensions.height / 2 + buttonSize + padding;
        } else if (currentY > screenDimensions.height / 2 - buttonSize - padding) {
          newY = screenDimensions.height / 2 - buttonSize - padding;
        }
        
        // Animate to constrained position if needed
        if (newX !== currentX || newY !== currentY) {
          Animated.spring(sessionButtonPosition, {
            toValue: { x: newX, y: newY },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;
  
  const isPracticingSong = isSong === 'true';
  const setlist = isPracticingSong ? null : setlists[id];
  
  // Check if we're in a session with multiple songs
  const isInSession = activeSession && activeSession.songIds.length > 1;
  const sessionSongId = isInSession ? getCurrentSessionSong(activeSession.id) : null;
  const sessionSongIndex = isInSession ? getSessionSongIndex(activeSession.id) : 0;
  const totalSessionSongs = isInSession ? getTotalSessionSongs(activeSession.id) : 0;
  
  // Debug logging
  console.log('Practice screen navigation debug:', {
    isPracticingSong,
    isInSession,
    activeSession: activeSession ? { id: activeSession.id, songIds: activeSession.songIds } : null,
    setlist: setlist ? { id: setlist.id, name: setlist.name, songsCount: setlist.songs.length } : null,
    sessionSongIndex,
    totalSessionSongs,
    currentSongIndex
  });
  
  // Determine current song based on context
  let currentSong = null;
  if (isPracticingSong) {
    currentSong = songs[id];
  } else if (isInSession && sessionSongId) {
    currentSong = songs[sessionSongId];
  } else if (setlist) {
    currentSong = songs[setlist.songs[currentSongIndex]];
  }
  
  // Update local volume when playback state changes
  useEffect(() => {
    setLocalVolume(playbackState.volume);
  }, [playbackState.volume]);
  
  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);
  
  useEffect(() => {
    // First unload any existing audio to prevent duplication
    const setupAudio = async () => {
      await unloadAudio();
      
      // Set the current setlist or song when the component mounts
      // But don't auto-play
      if (isPracticingSong) {
        setCurrentSong(id, false);
      } else if (isInSession && activeSession?.temporarySetlistId) {
        // Use the temporary setlist for session navigation
        setCurrentSetlist(activeSession.temporarySetlistId, sessionSongIndex, false);
      } else {
        setCurrentSetlist(id, 0, false);
      }
    };
    
    setupAudio();
    
    // Cleanup when unmounting
    return () => {
      setPlaybackState({ isPlaying: false, playbackRate: 1.0 });
      unloadAudio();
    };
  }, [id, isPracticingSong, isInSession, activeSession?.temporarySetlistId, sessionSongIndex]);
  
  useEffect(() => {
    // Update playback rate in the store
    setPlaybackState({ playbackRate });
  }, [playbackRate]);
  
  useEffect(() => {
    // Reset loop points when song changes
    if (playbackState.duration > 0) {
      setLoopEnd(playbackState.duration);
    }
  }, [currentSongIndex, playbackState.duration]);
  
  // Update progress periodically when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (playbackState.isPlaying && !isScrubbing) {
      interval = setInterval(() => {
        updatePlaybackStatus();
        
        // Handle looping
        if (isLoopActive && playbackState.currentTime >= loopEnd) {
          setPlaybackState({ currentTime: loopStart });
        }
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    playbackState.isPlaying, 
    updatePlaybackStatus, 
    isLoopActive, 
    loopStart, 
    loopEnd,
    isScrubbing
  ]);

  // Calculate progress width
  useEffect(() => {
    if (playbackState.duration > 0 && !isScrubbing) {
      const percentage = Math.min(100, (playbackState.currentTime / playbackState.duration) * 100);
      setProgressWidth(`${percentage}%`);
    }
  }, [playbackState.currentTime, playbackState.duration, isScrubbing]);
  
  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {isPracticingSong ? "Song not found" : isInSession ? "No songs in this session" : "No songs in this setlist"}
        </Text>
        <Pressable 
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }
  
  const handleTogglePlay = () => {
    if (Platform.OS === 'web' && currentSong?.audioUri) {
      Alert.alert("Not Available", "Audio playback is not available on web.");
      return;
    }
    setPlaybackState({ isPlaying: !playbackState.isPlaying });
  };
  
  const handleToggleLoop = () => {
    setIsLoopActive(!isLoopActive);
    setPlaybackState({ isLooping: !isLoopActive });
  };
  
  const handleRestart = () => {
    setPlaybackState({ currentTime: 0 });
  };
  
  const handleExit = async () => {
    // Make sure to unload audio before exiting
    await unloadAudio();
    router.back();
  };
  
  const handleNextSessionSong = async () => {
    if (isInSession && activeSession) {
      console.log('Next session song - current index:', sessionSongIndex, 'total:', totalSessionSongs);

      // Check if we can go to next song
      if (sessionSongIndex >= totalSessionSongs - 1) {
        console.log('Already at last song in session');
        return;
      }

      // Stop playback and unload current audio
      setPlaybackState({ isPlaying: false });
      await unloadAudio();

      // Update session state first
      nextSessionSong(activeSession.id);

      // Get the next song ID directly
      const nextIndex = sessionSongIndex + 1;
      const nextSongId = activeSession.songIds[nextIndex];
      console.log('Moving to next song:', nextSongId, 'at index:', nextIndex);

      if (nextSongId) {
        // Navigate to the next song
        router.replace(`/practice/${nextSongId}?isSong=true`);
      }
    } else {
      nextSong();
    }
  };
  
  const handlePreviousSessionSong = async () => {
    if (isInSession && activeSession) {
      console.log('Previous session song - current index:', sessionSongIndex, 'total:', totalSessionSongs);

      // Check if we can go to previous song
      if (sessionSongIndex <= 0) {
        console.log('Already at first song in session');
        return;
      }

      // Stop playback and unload current audio
      setPlaybackState({ isPlaying: false });
      await unloadAudio();

      // Update session state first
      previousSessionSong(activeSession.id);

      // Get the previous song ID directly
      const prevIndex = sessionSongIndex - 1;
      const prevSongId = activeSession.songIds[prevIndex];
      console.log('Moving to previous song:', prevSongId, 'at index:', prevIndex);

      if (prevSongId) {
        // Navigate to the previous song
        router.replace(`/practice/${prevSongId}?isSong=true`);
      }
    } else {
      previousSong();
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
  
  const hasAudio = Platform.OS !== 'web' && currentSong.audioUri;
  const lines = currentSong.lyrics ? currentSong.lyrics.split('\n') : [];
  const lyricsStartTime = currentSong.lyricsStartTime || 0;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={styles.header}>
        <Pressable 
          style={styles.exitButton}
          onPress={handleExit}
        >
          <X size={24} color={colors.text} />
        </Pressable>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>Practice Mode</Text>
          {isInSession && activeSession ? (
            <>
              <Text style={[styles.setlistName, { color: colors.text }]}>{activeSession.title}</Text>
              <Text style={[styles.songCounter, { color: colors.textSecondary }]}>
                Song {sessionSongIndex + 1} of {totalSessionSongs}
              </Text>
            </>
          ) : !isPracticingSong && setlist ? (
            <Text style={[styles.setlistName, { color: colors.text }]}>{setlist.name}</Text>
          ) : null}
        </View>
        
        <View style={styles.spacer}>
          {/* Show complete session button if session is active */}
          {activeSession && (
            <Pressable 
              style={[styles.completeSessionButton, { backgroundColor: colors.success }]}
              onPress={() => {
                Alert.alert(
                  'Complete Rehearsal Session',
                  'Are you sure you want to complete this rehearsal session? This will mark it as finished and delete the temporary setlist.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Complete Session',
                      style: 'default',
                      onPress: () => {
                        completeSession(activeSession.id);
                        router.replace('/(tabs)/rehearsal');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.completeSessionButtonText}>Complete</Text>
            </Pressable>
          )}
        </View>
      </View>
      
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
      
      <View style={[styles.lyricsContainer, isLyricsFullscreen && styles.lyricsFullscreen]}>
        <View style={styles.lyricsHeader}>
          <Pressable
            style={styles.fullscreenButton}
            onPress={() => setIsLyricsFullscreen(!isLyricsFullscreen)}
          >
            {isLyricsFullscreen ? (
              <Minimize2 size={20} color={colors.text} />
            ) : (
              <Maximize2 size={20} color={colors.text} />
            )}
          </Pressable>
        </View>
        <LyricsDisplay 
          lyrics={currentSong.lyrics} 
          chords={currentSong.chords} 
          initialScrollPosition={scrollStartLine}
          lyricsStartTime={lyricsStartTime}
        />
      </View>
      
      {!isLyricsFullscreen && (
      <View style={[styles.practiceControls, { backgroundColor: colors.surface }]}>
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, { color: colors.text }]}>Speed</Text>
          <View style={styles.speedControls}>
            <Pressable 
              style={[
                styles.speedButton, 
                { borderColor: colors.primary },
                playbackRate === 0.5 && [styles.activeSpeedButton, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setPlaybackRate(0.5)}
            >
              <Text 
                style={[
                  styles.speedButtonText, 
                  { color: colors.primary },
                  playbackRate === 0.5 && styles.activeSpeedButtonText
                ]}
              >
                0.5x
              </Text>
            </Pressable>
            <Pressable 
              style={[
                styles.speedButton, 
                { borderColor: colors.primary },
                playbackRate === 0.75 && [styles.activeSpeedButton, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setPlaybackRate(0.75)}
            >
              <Text 
                style={[
                  styles.speedButtonText, 
                  { color: colors.primary },
                  playbackRate === 0.75 && styles.activeSpeedButtonText
                ]}
              >
                0.75x
              </Text>
            </Pressable>
            <Pressable 
              style={[
                styles.speedButton, 
                { borderColor: colors.primary },
                playbackRate === 1.0 && [styles.activeSpeedButton, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setPlaybackRate(1.0)}
            >
              <Text 
                style={[
                  styles.speedButtonText, 
                  { color: colors.primary },
                  playbackRate === 1.0 && styles.activeSpeedButtonText
                ]}
              >
                1.0x
              </Text>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, { color: colors.text }]}>Loop Section</Text>
          <Pressable 
            style={[
              styles.loopButton, 
              { borderColor: colors.primary },
              isLoopActive && [styles.activeLoopButton, { backgroundColor: colors.primary }]
            ]}
            onPress={handleToggleLoop}
          >
            <Repeat 
              size={20} 
              color={isLoopActive ? '#fff' : colors.primary} 
            />
            <Text 
              style={[
                styles.loopButtonText, 
                { color: colors.primary },
                isLoopActive && styles.activeLoopButtonText
              ]}
            >
              {isLoopActive ? 'Looping' : 'Loop'}
            </Text>
          </Pressable>
        </View>
        
        {isLoopActive && (
          <View style={styles.loopControls}>
            <View style={styles.loopRow}>
              <Text style={[styles.loopLabel, { color: colors.textSecondary }]}>Start: {formatDuration(loopStart)}</Text>
              <Text style={[styles.loopLabel, { color: colors.textSecondary }]}>End: {formatDuration(loopEnd)}</Text>
            </View>
            <CustomSlider
              style={styles.loopSlider}
              minimumValue={0}
              maximumValue={playbackState.duration}
              value={loopStart}
              onValueChange={setLoopStart}
              minimumTrackTintColor={colors.textSecondary}
              maximumTrackTintColor={colors.primary}
              thumbTintColor={colors.textSecondary}
            />
            <CustomSlider
              style={styles.loopSlider}
              minimumValue={0}
              maximumValue={playbackState.duration}
              value={loopEnd}
              onValueChange={setLoopEnd}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.textSecondary}
              thumbTintColor={colors.primary}
            />
          </View>
        )}

        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, { color: colors.text }]}>Scroll Start Line</Text>
          <Pressable 
            style={[styles.loopButton, { borderColor: colors.primary }]}
            onPress={handleSetScrollStart}
          >
            <AlignStartVertical 
              size={20} 
              color={colors.primary} 
            />
            <Text style={[styles.loopButtonText, { color: colors.primary }]}>
              Line {scrollStartLine + 1}
            </Text>
          </Pressable>
        </View>
        
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, { color: colors.text }]}>Volume</Text>
          <Pressable 
            style={[styles.loopButton, { borderColor: colors.primary }]}
            onPress={handleToggleVolumeControls}
          >
            {getVolumeIcon()}
            <Text style={[styles.loopButtonText, { color: colors.primary }]}>
              {playbackState.isMuted ? 'Muted' : `${Math.round(playbackState.volume * 100)}%`}
            </Text>
          </Pressable>
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
      </View>
      )}
      
      {!isLyricsFullscreen && (
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
        
        <View style={styles.controlButtons}>
          {(isInSession || (!isPracticingSong && setlist && setlist.songs.length > 1)) && (
            <Pressable 
              style={styles.controlButton}
              onPress={handlePreviousSessionSong}
              disabled={isInSession ? sessionSongIndex === 0 : currentSongIndex === 0}
            >
              <ChevronLeft 
                size={32} 
                color={(isInSession ? sessionSongIndex === 0 : currentSongIndex === 0) ? colors.textSecondary : colors.text} 
              />
            </Pressable>
          )}
          
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
            onPress={handleToggleLoop}
          >
            <Repeat 
              size={24} 
              color={isLoopActive ? colors.primary : colors.text} 
            />
          </Pressable>
          
          {(isInSession || (!isPracticingSong && setlist && setlist.songs.length > 1)) && (
            <Pressable 
              style={styles.controlButton}
              onPress={handleNextSessionSong}
              disabled={isInSession ? sessionSongIndex === totalSessionSongs - 1 : (setlist ? currentSongIndex === setlist.songs.length - 1 : false)}
            >
              <ChevronRight 
                size={32} 
                color={(isInSession ? sessionSongIndex === totalSessionSongs - 1 : (setlist ? currentSongIndex === setlist.songs.length - 1 : false)) ? colors.textSecondary : colors.text} 
              />
            </Pressable>
          )}
        </View>
      </View>
      )}



      {/* Session Info Modal */}
      <Modal
        visible={showSessionInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSessionInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Session Details</Text>
              <Pressable 
                style={styles.modalCloseButton}
                onPress={() => setShowSessionInfo(false)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.sessionInfoContent}>
              {activeSession && (
                <>
                  <View style={styles.sessionInfoSection}>
                    <View style={styles.sessionInfoSectionHeader}>
                      <Target size={20} color={colors.primary} />
                      <Text style={[styles.sessionInfoSectionTitle, { color: colors.text }]}>Practice Goals</Text>
                    </View>
                    {activeSession.practiceGoals && activeSession.practiceGoals.length > 0 ? (
                      activeSession.practiceGoals.map((goal, index) => (
                        <View key={index} style={styles.sessionInfoItem}>
                          <Text style={[styles.sessionInfoBullet, { color: colors.primary }]}>•</Text>
                          <Text style={[styles.sessionInfoText, { color: colors.text }]}>{goal}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.sessionInfoEmptyText, { color: colors.textSecondary }]}>No practice goals set</Text>
                    )}
                  </View>
                  
                  <View style={styles.sessionInfoSection}>
                    <View style={styles.sessionInfoSectionHeader}>
                      <FileText size={20} color={colors.primary} />
                      <Text style={[styles.sessionInfoSectionTitle, { color: colors.text }]}>Description</Text>
                    </View>
                    {activeSession.notes ? (
                      <Text style={[styles.sessionInfoDescription, { color: colors.text }]}>{activeSession.notes}</Text>
                    ) : (
                      <Text style={[styles.sessionInfoEmptyText, { color: colors.textSecondary }]}>No description provided</Text>
                    )}
                  </View>
                  
                  <View style={styles.sessionInfoSection}>
                    <View style={styles.sessionInfoSectionHeader}>
                      <Clock size={20} color={colors.primary} />
                      <Text style={[styles.sessionInfoSectionTitle, { color: colors.text }]}>Session Info</Text>
                    </View>
                    <View style={styles.sessionInfoItem}>
                      <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>Duration:</Text>
                      <Text style={[styles.sessionInfoValue, { color: colors.text }]}>{activeSession.duration} minutes</Text>
                    </View>
                    <View style={styles.sessionInfoItem}>
                      <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>Songs:</Text>
                      <Text style={[styles.sessionInfoValue, { color: colors.text }]}>{activeSession.songIds.length} song{activeSession.songIds.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
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
                    scrollStartLine === index && [styles.selectedLineItem, { backgroundColor: colors.primary + '33' }]
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
      
      {/* Draggable Session Info Button */}
      {activeSession && (
        <Animated.View
          style={[
            styles.draggableSessionButton,
            {
              transform: sessionButtonPosition.getTranslateTransform(),
            },
          ]}
          {...sessionButtonPanResponder.panHandlers}
        >
          <Pressable 
            style={[styles.showSessionInfoButton, { backgroundColor: colors.secondary }]}
            onPress={() => setShowSessionInfo(true)}
          >
            <Target size={16} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
  },
  exitButton: {
    padding: 8,
    width: 40,
    flexShrink: 0,
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  setlistName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  songCounter: {
    fontSize: 12,
    marginTop: 2,
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
    position: 'relative',
  },
  lyricsFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    paddingHorizontal: 0,
    paddingTop: 120,
    backgroundColor: 'inherit',
  },
  lyricsHeader: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 1001,
  },
  fullscreenButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  practiceControls: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
  },
  speedControls: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeSpeedButton: {
    // Background color is added in the component
  },
  speedButtonText: {
    fontSize: 14,
  },
  activeSpeedButtonText: {
    color: '#fff',
  },
  loopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  activeLoopButton: {
    // Background color is added in the component
  },
  loopButtonText: {
    fontSize: 14,
  },
  activeLoopButtonText: {
    color: '#fff',
  },
  loopControls: {
    marginTop: 8,
  },
  loopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loopLabel: {
    fontSize: 12,
  },
  loopSlider: {
    height: 30,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
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
  controls: {
    padding: 16,
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
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
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
  spacer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  showSessionInfoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeSessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  completeSessionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionInfoContent: {
    maxHeight: 500,
    padding: 16,
  },
  sessionInfoSection: {
    marginBottom: 24,
  },
  sessionInfoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sessionInfoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sessionInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  sessionInfoBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sessionInfoText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  sessionInfoDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  sessionInfoEmptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  sessionInfoLabel: {
    fontSize: 16,
    minWidth: 80,
  },
  sessionInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  draggableSessionButton: {
    position: 'absolute',
    top: '50%',
    right: 20,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});