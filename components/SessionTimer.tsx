import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { useRehearsalStore } from '@/store/rehearsalStore';
import { CheckCircle, X, Pause, Play, Trophy } from 'lucide-react-native';
import { formatDuration } from '@/utils/timeUtils';
import { useRouter } from 'expo-router';

interface SessionTimerProps {
  sessionId: string;
  visible: boolean;
  onClose: () => void;
}

export default function SessionTimer({ sessionId, visible, onClose }: SessionTimerProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { 
    sessions, 
    markSessionComplete, 
    stopSession 
  } = useRehearsalStore();
  
  const [isPaused, setIsPaused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const session = sessions.find(s => s.id === sessionId);
  
  // Listen for session completion to show success modal
  useEffect(() => {
    if (session && session.completed && !showSuccessModal) {
      setShowSuccessModal(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [session?.completed, showSuccessModal, scaleAnim]);
  
  if (!session) return null;
  
  const timeRemaining = session.timeRemaining || 0;
  const totalTime = session.duration * 60;
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  
  const handlePauseResume = () => {
    // For now, we'll just toggle the local paused state
    // The global timer will continue running
    setIsPaused(!isPaused);
  };
  
  const handleStop = () => {
    Alert.alert(
      'Stop Session',
      'Are you sure you want to stop this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            stopSession(sessionId);
            onClose();
          },
        },
      ]
    );
  };
  

  
  console.log('SessionTimer render:', { visible, sessionId, session: session ? { id: session.id, isActive: session.isActive } : null });
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Practice Session</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.headerButton}
              >
                <X size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.title}</Text>
          
          <View style={styles.timerContainer}>
            <View style={styles.circularProgress}>
              <Svg width={200} height={200} style={styles.svg}>
                <Circle
                  cx={100}
                  cy={100}
                  r={90}
                  stroke="#E5E7EB"
                  strokeWidth={8}
                  fill="transparent"
                />
                <Circle
                  cx={100}
                  cy={100}
                  r={90}
                  stroke="#8B5CF6"
                  strokeWidth={8}
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
              </Svg>
              <View style={styles.timerTextContainer}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {formatDuration(timeRemaining)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.primary }]}
              onPress={handlePauseResume}
            >
              {isPaused ? (
                <Play size={20} color="#FFFFFF" />
              ) : (
                <Pause size={20} color="#FFFFFF" />
              )}
              <Text style={styles.controlButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.success }]}
              onPress={() => {
                markSessionComplete(sessionId);
                stopSession(sessionId);
                setShowSuccessModal(true);
                Animated.spring(scaleAnim, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 100,
                  friction: 8,
                }).start();
              }}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
          

        </View>
      </View>
      
      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          scaleAnim.setValue(0);
          onClose();
        }}
      >
        <View style={styles.successOverlay}>
          <Animated.View 
            style={[
              styles.successContainer, 
              { 
                backgroundColor: colors.surface,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
              <Trophy size={40} color="#FFFFFF" />
            </View>
            
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Great Job!
            </Text>
            
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              You completed your practice session!
            </Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowSuccessModal(false);
                scaleAnim.setValue(0);
                onClose();
              }}
            >
              <Text style={styles.successButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  timerContainer: {
    marginBottom: 32,
  },
  circularProgress: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  timerTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },


  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  successButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 120,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});