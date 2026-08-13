import { SafeAreaView } from "react-native-safe-area-context";
import ExpenseForm from "./components/ExpenseForm";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ExpenseForm />
    </SafeAreaView>
  );
}
