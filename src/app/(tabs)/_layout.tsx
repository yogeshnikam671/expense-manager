import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { colors } from "../../theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Add",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "add-circle" : "add-circle-outline"}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "time" : "time-outline"}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "settings" : "settings-outline"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
