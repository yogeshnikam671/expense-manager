import { initializeDatabase } from "@/storage/database";
import { Stack } from "expo-router";

import { colors } from "../theme";
import { ExpenseProvider } from "@/contexts/ExpenseContext";

initializeDatabase();

export default function RootLayout() {
  return (
    <ExpenseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ title: "Expenses" }} />
        <Stack.Screen
          name="category-expenses"
          options={{
            headerShown: true,
            title: "Expenses",
            headerBackTitle: "Back",
            headerBackButtonDisplayMode: "minimal",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </ExpenseProvider>
  );
}
