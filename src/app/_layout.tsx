import { Stack } from "expo-router";
import { initializeDatabase } from "./storage/database";

initializeDatabase();

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
