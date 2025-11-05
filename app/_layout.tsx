import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Slot, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "./error-boundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { MemoryManager } from "@/utils/memoryUtils";
import { useSongStore } from "@/store/songStore";
import { useKeepAwake } from "@/utils/keepAwakeUtils";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <StatusBar style="auto" />
            <LayoutContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LayoutContent() {
  const { cleanupOrphanedAudioFiles } = useSongStore();

  useKeepAwake();

  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupOrphanedAudioFiles();
      } catch (error) {
        console.error('Error during audio cleanup:', error);
      }
    };

    const timer = setTimeout(cleanup, 2000);
    return () => clearTimeout(timer);
  }, [cleanupOrphanedAudioFiles]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          MemoryManager.cleanupAll();
        } catch (error) {
          console.error('Memory cleanup error:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <Slot />;
}