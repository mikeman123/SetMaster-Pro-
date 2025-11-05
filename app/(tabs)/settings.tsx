import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Moon, Sun, Info, Clock, Smartphone } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const { colors, isDark, toggleTheme } = useTheme();

  const toggleAutoScroll = () => {
    updateSettings({ autoScroll: !settings.autoScroll });
  };

  const toggleKeepScreenAwake = () => {
    updateSettings({ keepScreenAwake: !settings.keepScreenAwake });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              {isDark ? (
                <Moon size={24} color={colors.primary} />
              ) : (
                <Sun size={24} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Font Size</Text>
          </View>
          <View style={styles.fontSizeControls}>
            <Pressable
              style={[styles.fontSizeButton, { 
                opacity: settings.fontScale <= 0.8 ? 0.5 : 1,
                backgroundColor: colors.surface 
              }]}
              onPress={() => updateSettings({ fontScale: Math.max(0.8, settings.fontScale - 0.1) })}
              disabled={settings.fontScale <= 0.8}
            >
              <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>A-</Text>
            </Pressable>
            <Text style={[styles.fontSizeValue, { color: colors.text }]}>{Math.round(settings.fontScale * 100)}%</Text>
            <Pressable
              style={[styles.fontSizeButton, { 
                opacity: settings.fontScale >= 1.5 ? 0.5 : 1,
                backgroundColor: colors.surface 
              }]}
              onPress={() => updateSettings({ fontScale: Math.min(1.5, settings.fontScale + 0.1) })}
              disabled={settings.fontScale >= 1.5}
            >
              <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>A+</Text>
            </Pressable>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Clock size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto-Scroll</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Automatically scroll lyrics during playback
              </Text>
            </View>
          </View>
          <Switch
            value={settings.autoScroll}
            onValueChange={toggleAutoScroll}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
        
        {settings.autoScroll && (
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Scroll Speed</Text>
            </View>
            <View style={styles.fontSizeControls}>
              <Pressable
                style={[styles.fontSizeButton, { 
                  opacity: settings.scrollSpeed <= 0.5 ? 0.5 : 1,
                  backgroundColor: colors.surface 
                }]}
                onPress={() => updateSettings({ scrollSpeed: Math.max(0.5, settings.scrollSpeed - 0.1) })}
                disabled={settings.scrollSpeed <= 0.5}
              >
                <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>-</Text>
              </Pressable>
              <Text style={[styles.fontSizeValue, { color: colors.text }]}>{Math.round(settings.scrollSpeed * 100)}%</Text>
              <Pressable
                style={[styles.fontSizeButton, { 
                  opacity: settings.scrollSpeed >= 1.5 ? 0.5 : 1,
                  backgroundColor: colors.surface 
                }]}
                onPress={() => updateSettings({ scrollSpeed: Math.min(1.5, settings.scrollSpeed + 0.1) })}
                disabled={settings.scrollSpeed >= 1.5}
              >
                <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Smartphone size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Keep Screen Awake</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Prevent screen from turning off during performance
              </Text>
            </View>
          </View>
          <Switch
            value={settings.keepScreenAwake}
            onValueChange={toggleKeepScreenAwake}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        
        <Pressable 
          style={styles.aboutItem}
          onPress={() => router.push('/modal')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Info size={24} color={colors.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>About SetMaster Pro</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontSizeValue: {
    fontSize: 14,
    marginHorizontal: 8,
    width: 40,
    textAlign: 'center',
  },
  aboutItem: {
    paddingVertical: 12,
  },
});