import HistoryScreen from "@/components/HistoryScreen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <HistoryScreen/>
    </SafeAreaView>
  );
}
