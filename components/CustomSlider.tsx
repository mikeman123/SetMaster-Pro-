import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';

interface CustomSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange?: (value: number) => void;
  onSlidingStart?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  style?: ViewStyle;
  trackStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
}

export default function CustomSlider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  style,
  trackStyle,
  thumbStyle,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#E5E5EA',
  thumbTintColor = '#FFFFFF',
  disabled = false,
}: CustomSliderProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const containerRef = useRef<View>(null);

  // Update current value when prop changes and not dragging
  React.useEffect(() => {
    if (!isDragging) {
      setCurrentValue(value);
    }
  }, [value, isDragging]);

  const getValueFromPosition = useCallback((locationX: number) => {
    if (containerWidth <= 0) return minimumValue;
    
    const trackPadding = 12;
    const effectiveTrackWidth = containerWidth - (trackPadding * 2);
    
    // Calculate position relative to the track
    const relativeX = locationX - trackPadding;
    
    // Calculate percentage with proper bounds
    let percentage = relativeX / effectiveTrackWidth;
    percentage = Math.max(0, Math.min(1, percentage));
    
    const newValue = minimumValue + percentage * (maximumValue - minimumValue);
    return Math.max(minimumValue, Math.min(maximumValue, newValue));
  }, [containerWidth, minimumValue, maximumValue]);

  const handleTouch = useCallback((evt: GestureResponderEvent) => {
    if (disabled) return;
    
    const newValue = getValueFromPosition(evt.nativeEvent.locationX);
    setCurrentValue(newValue);
    onValueChange?.(newValue);
  }, [disabled, getValueFromPosition, onValueChange]);

  const handleTouchStart = useCallback((evt: GestureResponderEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    const newValue = getValueFromPosition(evt.nativeEvent.locationX);
    setCurrentValue(newValue);
    onSlidingStart?.(newValue);
    onValueChange?.(newValue);
  }, [disabled, getValueFromPosition, onSlidingStart, onValueChange]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    
    setIsDragging(false);
    onSlidingComplete?.(currentValue);
  }, [disabled, currentValue, onSlidingComplete]);

  // Calculate thumb position and track fill width
  const thumbSize = 24;
  const trackPadding = 12;
  const effectiveTrackWidth = containerWidth - (trackPadding * 2);
  const percentage = maximumValue > minimumValue 
    ? (currentValue - minimumValue) / (maximumValue - minimumValue)
    : 0;
  const thumbPosition = trackPadding + (percentage * effectiveTrackWidth) - (thumbSize / 2);
  const trackFillWidth = trackPadding + (percentage * effectiveTrackWidth);

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={(evt) => setContainerWidth(evt.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouch}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
    >
      {/* Track background */}
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }, trackStyle]} />
      
      {/* Track fill */}
      <View
        style={[
          styles.trackFill,
          { 
            backgroundColor: minimumTrackTintColor, 
            width: trackFillWidth
          },
          trackStyle,
        ]}
      />
      
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          { 
            backgroundColor: thumbTintColor, 
            left: thumbPosition
          },
          thumbStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 12,
    right: 12,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 12,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});