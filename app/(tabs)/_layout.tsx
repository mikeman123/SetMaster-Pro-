import React from "react";
import { Tabs } from "expo-router";
import { Home, ListMusic, Music, Settings, Calendar } from "lucide-react-native";
import PlayerControls from "@/components/PlayerControls";
import { usePlayerStore } from "@/store/playerStore";
import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { currentSongId } = usePlayerStore();
  const { colors } = useTheme();
  const showPlayer = currentSongId !== null;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="setlists"
          options={{
            title: "Setlists",
            tabBarIcon: ({ color }) => <ListMusic size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="songs"
          options={{
            title: "Songs",
            tabBarIcon: ({ color }) => <Music size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="rehearsal"
          options={{
            title: "Rehearsal",
            tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
      </Tabs>
      
      {showPlayer && <PlayerControls />}
    </>
  );
}