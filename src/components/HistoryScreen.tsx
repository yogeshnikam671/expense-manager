import { Expense, ExpenseNature } from "@/models/expense";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { getTotalSpend } from "@/utils/expenseAnalytics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const repository = new SQLiteExpenseRepository();

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function HistoryScreen() {
  const [fromDate] = useState(startOfMonth());
  const [toDate] = useState(new Date());

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedNature] = useState<ExpenseNature>(
    ExpenseNature.Essential
  );

  async function loadExpenses() {
    const result = await repository.getBetween(fromDate, toDate);
    setExpenses(result);
  }

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [fromDate, toDate])
  );

  const totalSpend = getTotalSpend(expenses);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          History
        </Text>

        <Text>
          From: {fromDate.toLocaleDateString()}
        </Text>

        <Text>
          To: {toDate.toLocaleDateString()}
        </Text>

        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          ₹{totalSpend}
        </Text>

        <Text>
          Selected nature: {selectedNature}
        </Text>

        <Text>
          Expenses found: {expenses.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}
