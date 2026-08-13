import ExpenseForm from "@/components/ExpenseForm";
import { SafeAreaView } from "react-native-safe-area-context";

export default function History() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ExpenseForm />
    </SafeAreaView>
  );
}
