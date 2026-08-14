import {
  Expense,
  ExpenseCategory,
  ExpenseNature,
} from "@/models/expense";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const repository = new SQLiteExpenseRepository();

export default function CategoryDetailScreen() {
  const { from, to, nature, category, total } = useLocalSearchParams<{
    from: string;
    to: string;
    nature: string;
    category: string;
    total: string;
  }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    const allExpenses = await repository.getBetween(
      new Date(from),
      new Date(to)
    );

    const matchingExpenses = allExpenses.filter(
      (expense) =>
        expense.nature === (nature as ExpenseNature) &&
        expense.category === (category as ExpenseCategory)
    );

    setExpenses(matchingExpenses);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          {category}
        </Text>

        <Text>{nature}</Text>

        <Text>
          {new Date(from).toLocaleDateString()} -{" "}
          {new Date(to).toLocaleDateString()}
        </Text>

        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          ₹{total}
        </Text>

        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700" }}>
                ₹{item.amount}
              </Text>

              <Text>{item.date.toLocaleDateString()}</Text>

              {item.description && <Text>{item.description}</Text>}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
