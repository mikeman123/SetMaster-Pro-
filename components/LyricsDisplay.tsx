import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';

interface LyricsDisplayProps {
  lyrics: string;
  chords?: Record<number, string>;
  fullScreen?: boolean;
  initialScrollPosition?: number;
  lyricsStartTime?: number; // Timestamp when lyrics should start scrolling
  onLinePress?: (lineIndex: number) => void;
}

export default function LyricsDisplay({ 
  lyrics, 
  chords = {}, 
  fullScreen = false,
  initialScrollPosition = 0,
  lyricsStartTime = 0,
  onLinePress
}: LyricsDisplayProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { settings } = useSettingsStore();
  const { playbackState } = usePlayerStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const [linePositions, setLinePositions] = useState<number[]>([]);
  const [hasStartedScrolling, setHasStartedScrolling] = useState(false);
  
  const lines = lyrics ? lyrics.split('\n') : [''];
  
  // Calculate line positions once we know their heights
  useEffect(() => {
    if (lineHeights.length === lines.length && lineHeights.every(h => h > 0)) {
      const positions: number[] = [];
      let currentPosition = 0;
      
      lineHeights.forEach((height, index) => {
        positions.push(currentPosition);
        currentPosition += height;
      });
      
      setLinePositions(positions);
    }
  }, [lineHeights, lines.length]);
  
  // Set initial scroll position
  useEffect(() => {
    if (scrollViewRef.current && initialScrollPosition > 0 && linePositions.length > 0) {
      const lineIndex = Math.min(initialScrollPosition, linePositions.length - 1);
      scrollViewRef.current.scrollTo({ y: linePositions[lineIndex], animated: true });
    }
  }, [initialScrollPosition, linePositions]);
  
  // Auto-scroll logic
  useEffect(() => {
    if (settings.autoScroll && playbackState.isPlaying && contentHeight > scrollViewHeight) {
      const scrollDuration = playbackState.duration - lyricsStartTime;
      const totalScrollDistance = contentHeight - scrollViewHeight;
      const scrollPerSecond = totalScrollDistance / scrollDuration;
      
      // If we have an initial scroll position, start from there
      let initialOffset = 0;
      if (initialScrollPosition > 0 && linePositions.length > initialScrollPosition) {
        initialOffset = linePositions[initialScrollPosition];
      }
      
      const scrollInterval = setInterval(() => {
        if (scrollViewRef.current && playbackState.isPlaying) {
          // Only start scrolling after the lyrics start time
          if (playbackState.currentTime >= lyricsStartTime) {
            if (!hasStartedScrolling) {
              setHasStartedScrolling(true);
            }
            
            const adjustedTime = playbackState.currentTime - lyricsStartTime;
            const progressPercentage = adjustedTime / scrollDuration;
            const currentPosition = initialOffset + (progressPercentage * (totalScrollDistance - initialOffset));
            scrollViewRef.current.scrollTo({ y: Math.max(0, currentPosition), animated: false });
          } else if (initialOffset > 0 && !hasStartedScrolling) {
            // If we have an initial position but haven't reached the lyrics start time,
            // make sure we're already scrolled to the initial position
            scrollViewRef.current.scrollTo({ y: initialOffset, animated: false });
          }
        }
      }, 100);
      
      return () => clearInterval(scrollInterval);
    }
    
    // Reset the scrolling state when playback stops
    if (!playbackState.isPlaying) {
      setHasStartedScrolling(false);
    }
  }, [
    settings.autoScroll, 
    playbackState.isPlaying, 
    playbackState.currentTime, 
    playbackState.duration,
    contentHeight,
    scrollViewHeight,
    initialScrollPosition,
    linePositions,
    lyricsStartTime,
    hasStartedScrolling
  ]);
  
  const handleLineLayout = (index: number, event: any) => {
    const { height } = event.nativeEvent.layout;
    setLineHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  };
  
  const handleLinePress = (index: number) => {
    if (onLinePress) {
      onLinePress(index);
    }
  };
  
  return (
    <ScrollView
      ref={scrollViewRef}
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: colors.background }
      ]}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      onLayout={(event) => setScrollViewHeight(event.nativeEvent.layout.height)}
    >
      <View style={[
        styles.lyricsContainer,
        fullScreen && {
          paddingTop: Platform.OS === 'web' ? 60 : Math.max(insets.top + 20, 60)
        }
      ]}>
        {lines.map((line, index) => (
          <Pressable 
            key={index} 
            style={styles.lineContainer}
            onLayout={(event) => handleLineLayout(index, event)}
            onPress={() => handleLinePress(index)}
          >
            {chords && chords[index] && (
              <Text style={[styles.chord, { color: colors.secondary }]}>
                {chords[index]}
              </Text>
            )}
            <Text 
              style={[
                styles.lyric, 
                { 
                  color: colors.text,
                  fontSize: 16 * settings.fontScale
                }
              ]}
            >
              {line.trim() === '' ? '\u00A0' : line}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  lyricsContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding at the bottom
  },
  lineContainer: {
    marginBottom: 8,
  },
  chord: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  lyric: {
    lineHeight: 24,
  },
});