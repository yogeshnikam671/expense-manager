import { initializeDatabase } from "@/storage/database";
import { Stack } from "expo-router";

initializeDatabase();

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
