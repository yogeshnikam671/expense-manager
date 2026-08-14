import { Expense, ExpenseNature } from "@/models/expense";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { getCategoryBreakdown, getTotalSpend } from "@/utils/expenseAnalytics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";

const repository = new SQLiteExpenseRepository();

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function HistoryScreen() {
  const [fromDate, setFromDate] = useState(startOfMonth());
  const [toDate, setToDate] = useState(new Date());

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedNature, setSelectedNature] = useState<ExpenseNature>(
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
  
  const expensesForSelectedNature = expenses.filter(
    (expense) => expense.nature === selectedNature
  );

  const categoryBreakdown = getCategoryBreakdown(
    expensesForSelectedNature
  );
  
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          History
        </Text>

        <Text>From</Text>
        <DateTimePicker
          value={fromDate}
          mode="date"
          maximumDate={toDate}
          onValueChange={(_, selectedDate) => {
            if (selectedDate) setFromDate(selectedDate);
          }}
        />

        <Text>To</Text>
        <DateTimePicker
          value={toDate}
          mode="date"
          minimumDate={fromDate}
          maximumDate={new Date()}
          onValueChange={(_, selectedDate) => {
            if (selectedDate) setToDate(selectedDate);
          }}
        />

        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          ₹{totalSpend}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {Object.values(ExpenseNature).map((nature) => (
            <Pressable
              key={nature}
              onPress={() => setSelectedNature(nature)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderWidth: 1,
                borderRadius: 8,
                backgroundColor: selectedNature === nature ? "#ddd" : "white",
              }}
            >
              <Text>{nature}</Text>
            </Pressable>
          ))}
        </View>

        <Text>
          {selectedNature} expenses: {expensesForSelectedNature.length}
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            Categories
          </Text>

          {categoryBreakdown.length === 0 && (
            <Text>No expenses found for this nature.</Text>
          )}

          {categoryBreakdown.map((item) => (
            <Pressable
              key={`${item.nature}-${item.category}`}
              style={{
                padding: 16,
                borderWidth: 1,
                borderRadius: 8,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
              onPress={() => {
                router.push({
                  pathname: "/category-detail",
                  params: {
                    from: fromDate.toISOString(),
                    to: toDate.toISOString(),
                    nature: item.nature,
                    category: item.category,
                    total: String(item.total),
                  },
                });
              }}
            >
              <View>
                <Text style={{ fontWeight: "700" }}>
                  {item.category}
                </Text>
                <Text>
                  {item.count} expenses
                </Text>
              </View>
              <Text style={{ fontWeight: "700" }}>
                ₹{item.total}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
