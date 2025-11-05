import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,

  Dimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRehearsalStore, RehearsalSession, RehearsalPlan } from '@/store/rehearsalStore';

import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { generateId } from '@/utils/idUtils';
import { formatDuration } from '@/utils/timeUtils';
import { Calendar, Clock, Music, Sparkles, X, CheckCircle, ChevronDown, ChevronUp, Play, Target, Focus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function RehearsalScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    sessions,
    loadPlans,
    addPlan,
    addSession,
    markSessionComplete,
    startSession,
    getUpcomingSessions,
    getPastSessions,
    getActiveSession,
    clearUpcomingSessions,
    clearCompletedSessions,
    stopSession,
    completeSession,
  } = useRehearsalStore();
  const { setlists } = useSetlistStore();
  const { songs } = useSongStore();
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedSetlist, setSelectedSetlist] = useState<string | null>(null);
  const [availableTime, setAvailableTime] = useState('60');
  const [sessionCount, setSessionCount] = useState('3');
  const [practiceGoals, setPracticeGoals] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<RehearsalSession[]>([]);
  const [pastSessions, setPastSessions] = useState<RehearsalSession[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());


  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    setUpcomingSessions(getUpcomingSessions());
    setPastSessions(getPastSessions());
  }, [sessions]);

  const generateAISchedule = async () => {
    if (!selectedSetlist) {
      Alert.alert('Error', 'Please select a setlist first');
      return;
    }

    const setlist = Object.values(setlists).find(s => s.id === selectedSetlist);
    if (!setlist) return;

    setIsGenerating(true);

    try {
      const setlistSongs = setlist.songs
        .map((id: any) => Object.values(songs).find(s => s.id === id))
        .filter(Boolean);

      const prompt = `You are a professional music rehearsal coach. Create an optimal rehearsal schedule for a setlist.

Setlist: "${setlist.name}"
Songs (${setlistSongs.length}):
${setlistSongs.map((s: any) => `- ${s?.title} (${s?.duration ? formatDuration(s.duration) : 'unknown duration'})`).join('\n')}

Parameters:
- Total available time per session: ${availableTime} minutes
- Number of sessions: ${sessionCount}
- Practice goals: ${practiceGoals || 'General improvement and performance readiness'}
- Focus areas: ${focusAreas || 'All aspects of performance'}

Create a detailed rehearsal plan with ${sessionCount} sessions. For each session provide:
1. Session title (descriptive and motivating)
2. Duration in minutes (should not exceed ${availableTime} minutes)
3. Which songs to practice (use exact song titles from the list)
4. Specific practice goals for that session
5. Focus areas (technique, timing, transitions, etc.)
6. Brief notes with tips

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "sessions": [
    {
      "title": "Session Title",
      "duration": 60,
      "songs": ["Song Title 1", "Song Title 2"],
      "practiceGoals": ["Goal 1", "Goal 2"],
      "focusAreas": ["Area 1", "Area 2"],
      "notes": "Tips and advice for this session"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no explanations or markdown formatting.
Make the schedule progressive, building from fundamentals to full performance. Consider song difficulty, transitions, and stamina building.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a professional music rehearsal coach. You must respond ONLY with valid JSON, no markdown formatting, no code blocks, no explanations. Just the raw JSON object.' },
            { role: 'user', content: prompt }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule');
      }

      const data = await response.json();
      const aiResponse = data.completion;
      
      // Parse the JSON response
      let parsedResponse;
      try {
        // Try to parse the response directly first
        parsedResponse = JSON.parse(aiResponse);
      } catch (firstError) {
        try {
          // If direct parsing fails, try to extract JSON from the response
          // Look for JSON object or array patterns
          const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
          const jsonArrayMatch = aiResponse.match(/\[[\s\S]*\]/);
          
          if (jsonObjectMatch) {
            parsedResponse = JSON.parse(jsonObjectMatch[0]);
          } else if (jsonArrayMatch) {
            // If it's an array, wrap it in an object with sessions key
            parsedResponse = { sessions: JSON.parse(jsonArrayMatch[0]) };
          } else {
            // Try to clean the response and parse again
            const cleanedResponse = aiResponse.trim();
            parsedResponse = JSON.parse(cleanedResponse);
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          console.error('AI Response was:', aiResponse);
          Alert.alert('Error', 'Failed to parse AI response. Please try again.');
          setIsGenerating(false);
          return;
        }
      }

      // Validate the response structure
      if (!parsedResponse.sessions || !Array.isArray(parsedResponse.sessions)) {
        console.error('Invalid response structure:', parsedResponse);
        Alert.alert('Error', 'Invalid response format from AI. Please try again.');
        setIsGenerating(false);
        return;
      }

      // Create the rehearsal plan
      const now = new Date();
      const planId = generateId();
      const generatedSessions: RehearsalSession[] = parsedResponse.sessions.map((session: any, index: number) => {
        // Map song titles to IDs
        const songIds = session.songs
          .map((title: string) => setlistSongs.find((s: any) => s?.title === title)?.id)
          .filter(Boolean) as string[];

        // Calculate session date (spread sessions over days)
        const sessionDate = new Date(now);
        sessionDate.setDate(sessionDate.getDate() + (index * 2)); // Every 2 days
        sessionDate.setHours(18, 0, 0, 0); // Default to 6 PM

        return {
          id: generateId(),
          title: session.title,
          date: sessionDate,
          duration: session.duration,
          setlistId: selectedSetlist,
          songIds,
          notes: session.notes,
          completed: false,
          practiceGoals: session.practiceGoals,
          focusAreas: session.focusAreas,
        };
      });

      const plan: RehearsalPlan = {
        id: planId,
        name: `${setlist.name} Rehearsal Plan`,
        sessions: generatedSessions,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDuration: generatedSessions.reduce((sum, s) => sum + s.duration, 0),
        aiGenerated: true,
      };

      // Clear existing upcoming sessions before adding new ones
      clearUpcomingSessions();
      
      addPlan(plan);
      
      // Add sessions to the store
      generatedSessions.forEach(session => addSession(session));

      Alert.alert('Success', 'AI rehearsal schedule generated successfully!');
      setShowAIModal(false);
      resetForm();
    } catch (error) {
      console.error('Error generating schedule:', error);
      Alert.alert('Error', 'Failed to generate schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedSetlist(null);
    setAvailableTime('60');
    setSessionCount('3');
    setPracticeGoals('');
    setFocusAreas('');
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleStartSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Check if there are songs to practice
    if (session.songIds.length === 0) {
      Alert.alert('No Songs', 'This session has no songs to practice.');
      return;
    }

    // Start the session
    startSession(sessionId);

    // Navigate to the first song in practice mode
    const firstSongId = session.songIds[0];
    router.push(`/practice/${firstSongId}?isSong=true`);
  };

  const handleResumeSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.isActive) return;

    // Navigate to the current song in the session
    const currentSongIndex = session.currentSongIndex || 0;
    const currentSongId = session.songIds[currentSongIndex];
    if (currentSongId) {
      router.push(`/practice/${currentSongId}?isSong=true`);
    }
  };

  const renderSession = ({ item }: { item: RehearsalSession }) => {
    const setlist = Object.values(setlists).find(s => s.id === item.setlistId);
    const sessionSongs = item.songIds
      .map(id => Object.values(songs).find(s => s.id === id))
      .filter(Boolean);
    const isExpanded = expandedSessions.has(item.id);

    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.sessionHeader}
          onPress={() => toggleSessionExpansion(item.id)}
        >
          <View style={styles.sessionTitleContainer}>
            <Text style={[styles.sessionTitle, { color: colors.text }]}>{item.title}</Text>
            {item.completed && (
              <CheckCircle size={20} color={colors.success} />
            )}
            {item.isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]}>
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        
        <View style={styles.sessionMeta}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.date.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.duration} min
            </Text>
          </View>
          {setlist && (
            <View style={styles.metaItem}>
              <Music size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {sessionSongs.length} songs
              </Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.practiceGoals.length > 0 && (
              <View style={styles.expandedSection}>
                <View style={styles.expandedSectionHeader}>
                  <Target size={16} color={colors.primary} />
                  <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>Practice Goals</Text>
                </View>
                {item.practiceGoals.map((goal, index) => (
                  <Text key={index} style={[styles.expandedText, { color: colors.text }]}>
                    • {goal}
                  </Text>
                ))}
              </View>
            )}

            {item.focusAreas.length > 0 && (
              <View style={styles.expandedSection}>
                <View style={styles.expandedSectionHeader}>
                  <Focus size={16} color={colors.primary} />
                  <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>Focus Areas</Text>
                </View>
                {item.focusAreas.map((area, index) => (
                  <Text key={index} style={[styles.expandedText, { color: colors.text }]}>
                    • {area}
                  </Text>
                ))}
              </View>
            )}

            {sessionSongs.length > 0 && (
              <View style={styles.expandedSection}>
                <View style={styles.expandedSectionHeader}>
                  <Music size={16} color={colors.primary} />
                  <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>Songs to Practice</Text>
                </View>
                {sessionSongs.map((song: any, index) => (
                  <Text key={index} style={[styles.expandedText, { color: colors.text }]}>
                    • {song?.title} - {song?.artist}
                  </Text>
                ))}
              </View>
            )}

            {item.notes && (
              <View style={styles.expandedSection}>
                <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.expandedText, { color: colors.textSecondary }]}>
                  {item.notes}
                </Text>
              </View>
            )}

            {!item.completed && (
              <View style={styles.sessionButtons}>
                {!item.isActive ? (
                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleStartSession(item.id)}
                  >
                    <Play size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start Session</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.startButton, { backgroundColor: colors.success }]}
                      onPress={() => handleResumeSession(item.id)}
                    >
                      <Play size={20} color="#FFFFFF" />
                      <Text style={styles.startButtonText}>Resume Session</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.completeButton, { backgroundColor: colors.success }]}
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
                                completeSession(item.id);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <CheckCircle size={20} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Complete Session</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAIModal(true)}
        >
          <Sparkles size={20} color="#FFFFFF" />
          <Text style={styles.aiButtonText}>Generate AI Schedule</Text>
        </TouchableOpacity>

        {upcomingSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Sessions</Text>
            <FlatList
              data={upcomingSessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {pastSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed Sessions</Text>
            <FlatList
              data={pastSessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error }]}
              onPress={() => {
                Alert.alert(
                  'Clear Completed Sessions',
                  'Are you sure you want to clear all completed sessions? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: () => {
                        clearCompletedSessions();
                      },
                    },
                  ]
                );
              }}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.clearButtonText}>Clear Completed Sessions</Text>
            </TouchableOpacity>
          </View>
        )}

        {upcomingSessions.length === 0 && pastSessions.length === 0 && (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No rehearsal sessions yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Generate an AI schedule to get started
            </Text>
          </View>
        )}
      </ScrollView>



      <Modal
        visible={showAIModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAIModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>AI Rehearsal Scheduler</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
              bounces={true}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Select Setlist</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.values(setlists).map((setlist) => (
                    <TouchableOpacity
                      key={setlist.id}
                      style={[
                        styles.setlistChip,
                        { 
                          backgroundColor: selectedSetlist === setlist.id ? colors.primary : colors.background,
                          borderColor: colors.border,
                        }
                      ]}
                      onPress={() => setSelectedSetlist(setlist.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selectedSetlist === setlist.id ? '#FFFFFF' : colors.text }
                        ]}
                      >
                        {setlist.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Session Duration (minutes)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  value={availableTime}
                  onChangeText={setAvailableTime}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Number of Sessions</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  value={sessionCount}
                  onChangeText={setSessionCount}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Practice Goals (optional)</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                  value={practiceGoals}
                  onChangeText={setPracticeGoals}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g., Improve timing, master difficult sections, build stamina"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Focus Areas (optional)</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, color: colors.text }]}
                  value={focusAreas}
                  onChangeText={setFocusAreas}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g., Vocals, guitar solos, song transitions"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  { 
                    backgroundColor: colors.primary,
                    opacity: isGenerating || !selectedSetlist ? 0.5 : 1,
                  }
                ]}
                onPress={generateAISchedule}
                disabled={isGenerating || !selectedSetlist}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Sparkles size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate Schedule</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sessionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  goalsContainer: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: screenHeight * 0.75,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: screenHeight * 0.6,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  setlistChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  expandedSection: {
    marginBottom: 16,
  },
  expandedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedText: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
    lineHeight: 20,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});