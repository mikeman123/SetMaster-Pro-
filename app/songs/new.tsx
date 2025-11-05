import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Save, X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useSongStore } from '@/store/songStore';
import { generateId } from '@/utils/idUtils';
import AudioFileSelector from '@/components/AudioFileSelector';

export default function NewSongScreen() {
  const router = useRouter();
  const { addSong } = useSongStore();
  
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [tempo, setTempo] = useState('');
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [notes, setNotes] = useState('');
  const [lyricsStartTime, setLyricsStartTime] = useState('0');
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const [audioFileName, setAudioFileName] = useState<string | undefined>();
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  
  const isFormValid = title.trim() !== '' && artist.trim() !== '';
  
  const handleSave = () => {
    if (!isFormValid) return;
    
    const newSong = {
      id: generateId(),
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim() || 'C',
      tempo: parseInt(tempo) || 120,
      duration: audioDuration || parseInt(duration) || 180,
      lyrics: lyrics.trim(),
      notes: notes.trim(),
      lyricsStartTime: parseFloat(lyricsStartTime) || 0,
      audioUri,
      audioFileName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    addSong(newSong);
    router.back();
  };
  
  const handleAudioSelected = (uri: string, fileName: string, duration: number) => {
    setAudioUri(uri);
    setAudioFileName(fileName);
    setAudioDuration(duration);
    setDuration(Math.round(duration).toString());
  };
  
  const handleAudioRemoved = () => {
    setAudioUri(undefined);
    setAudioFileName(undefined);
    setAudioDuration(undefined);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable 
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <X size={24} color={colors.dark.text} />
        </Pressable>
        
        <Text style={styles.headerTitle}>New Song</Text>
        
        <Pressable 
          style={[
            styles.headerButton,
            !isFormValid && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={!isFormValid}
        >
          <Save size={24} color={isFormValid ? colors.dark.primary : colors.dark.textSecondary} />
        </Pressable>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter song title"
            placeholderTextColor={colors.dark.textSecondary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Artist *</Text>
          <TextInput
            style={styles.input}
            value={artist}
            onChangeText={setArtist}
            placeholder="Enter artist name"
            placeholderTextColor={colors.dark.textSecondary}
          />
        </View>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Key</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="C"
              placeholderTextColor={colors.dark.textSecondary}
            />
          </View>
          
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Tempo (BPM)</Text>
            <TextInput
              style={styles.input}
              value={tempo}
              onChangeText={setTempo}
              placeholder="120"
              placeholderTextColor={colors.dark.textSecondary}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Duration (sec)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="180"
              placeholderTextColor={colors.dark.textSecondary}
              keyboardType="number-pad"
            />
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Audio File</Text>
          <AudioFileSelector 
            audioUri={audioUri}
            audioFileName={audioFileName}
            onAudioSelected={handleAudioSelected}
            onAudioRemoved={handleAudioRemoved}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lyrics Start Time (seconds)</Text>
          <View style={styles.infoRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={lyricsStartTime}
              onChangeText={setLyricsStartTime}
              placeholder="0"
              placeholderTextColor={colors.dark.textSecondary}
              keyboardType="numeric"
            />
            <Text style={styles.infoText}>
              When lyrics should start scrolling (for songs with instrumental intros)
            </Text>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lyrics</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={lyrics}
            onChangeText={setLyrics}
            placeholder="Enter lyrics here"
            placeholderTextColor={colors.dark.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add performance notes, reminders, etc."
            placeholderTextColor={colors.dark.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  headerButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    padding: 12,
    color: colors.dark.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.dark.textSecondary,
  },
});