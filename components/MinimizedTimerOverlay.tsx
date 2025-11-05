import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRehearsalStore } from '@/store/rehearsalStore';
import { formatDuration } from '@/utils/timeUtils';

interface MinimizedTimerOverlayProps {
  sessionId: string;
  onExpand: () => void;
  onClose: () => void;
}

export default function MinimizedTimerOverlay({ sessionId, onExpand, onClose }: MinimizedTimerOverlayProps) {
  const { colors } = useTheme();
  const { sessions } = useRehearsalStore();
  const pan = useRef(new Animated.ValueXY()).current;
  const [isMinimized, setIsMinimized] = useState(false);
  
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session || !session.isActive) return null;
  
  const timeRemaining = session.timeRemaining || 0;
  const screenWidth = Dimensions.get('window').width;
  
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to horizontal gestures
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderGrant: () => {
      pan.setOffset({
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      });
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow rightward movement, but limit to keep at least 60px visible
      const maxPosition = screenWidth - 60; // Always keep at least 60px visible
      const currentOffset = (pan.x as any)._offset || 0;
      const proposedX = currentOffset + gestureState.dx;
      const clampedX = Math.max(0, Math.min(maxPosition, proposedX));
      
      if (gestureState.dx >= 0) {
        pan.setValue({ x: clampedX - currentOffset, y: 0 });
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      pan.flattenOffset();
      
      const threshold = screenWidth * 0.2; // 20% of screen width
      
      if (gestureState.dx > threshold) {
        // Slide to minimized position (mostly off-screen but always keep 60px visible)
        const minimizedPosition = screenWidth - 60; // Show only 60px
        Animated.spring(pan, {
          toValue: { x: minimizedPosition, y: 0 },
          useNativeDriver: false,
        }).start();
        setIsMinimized(true);
      } else {
        // Snap back to original position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        setIsMinimized(false);
      }
    },
  });
  
  const handleTimerPress = () => {
    if (isMinimized) {
      // If minimized, slide back to normal position
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      setIsMinimized(false);
    } else {
      // If normal, expand the timer
      console.log('MinimizedTimer: onExpand called');
      onExpand();
    }
  };
  
  const handleClose = () => {
    onClose();
  };
  
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.timerWrapper,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.timer, { backgroundColor: colors.primary }]}
          onPress={handleTimerPress}
          activeOpacity={0.9}
        >
          <Text style={[styles.timeText, isMinimized && styles.minimizedTimeText]}>
            {isMinimized ? formatDuration(timeRemaining).split(':')[0] + 'm' : formatDuration(timeRemaining)}
          </Text>
          {!isMinimized && (
            <TouchableOpacity
              style={styles.button}
              onPress={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  timerWrapper: {
    position: 'absolute',
    right: 0,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 5,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  minimizedTimeText: {
    marginRight: 0,
    fontSize: 14,
  },
  button: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});