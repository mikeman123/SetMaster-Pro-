import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View, ScrollView, Pressable, Linking } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ModalScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>About SetMaster Pro</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            SetMaster Pro is a powerful tool for musicians to organize songs into setlists for performances, rehearsals, and practice sessions.
          </Text>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Create and manage multiple setlists
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Add songs with lyrics, chords, and notes
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Attach audio files to songs for practice
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Live performance mode with large text display
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Practice mode with audio playback
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Share setlists with other musicians
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Dark and light theme options
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How to Use</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            1. Create songs in the Songs tab with lyrics, chords, and optional audio files.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            2. Create setlists in the Setlists tab and add your songs to them.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            3. Use Live Mode during performances to see lyrics and chords in a large, easy-to-read format.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            4. Use Practice Mode to rehearse with audio playback.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            5. Share your setlists with band members by using the Share button.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sharing Setlists</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You can share setlists with other SetMaster Pro users. When you share a setlist, it creates a .setmaster file that contains all the setlist information and songs.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            When someone receives your shared setlist file, they can simply tap on it to automatically import it into their SetMaster Pro app.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            SetMaster Pro v1.0.0
          </Text>
          <Pressable onPress={() => Linking.openURL('https://example.com/privacy')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 18,
    marginRight: 8,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});