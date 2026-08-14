import { Expense, ExpenseNature } from "@/models/expense";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { getCategoryBreakdown, getTotalSpend } from "@/utils/expenseAnalytics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  colors,
  commonStyles,
  formatCurrency,
  formatDate,
  spacing,
} from "../theme";

const repository = new SQLiteExpenseRepository();

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function HistoryScreen() {
  const [fromDate, setFromDate] = useState(startOfMonth());
  const [toDate, setToDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedNature, setSelectedNature] = useState(ExpenseNature.Essential);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadExpenses = useCallback(async () => {
    setLoading(true);

    try {
      setExpenses(await repository.getBetween(fromDate, toDate));
      setError("");
    } catch {
      setError("Could not load history. Try again.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const expensesForSelectedNature = expenses.filter(
    (expense) => expense.nature === selectedNature
  );
  const categoryBreakdown = getCategoryBreakdown(expensesForSelectedNature);

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
    >
      <Text style={commonStyles.title}>History</Text>
      <Text style={commonStyles.subtitle}>
        Review spending by date, nature, and category.
      </Text>

      <View style={commonStyles.card}>
        <Text style={styles.sectionTitle}>Date range</Text>

        <View style={styles.dateRow}>
          <Pressable
            style={styles.dateField}
            onPress={() => setPicker("from")}
          >
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>{formatDate(fromDate)}</Text>
          </Pressable>

          <Pressable style={styles.dateField} onPress={() => setPicker("to")}>
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>{formatDate(toDate)}</Text>
          </Pressable>
        </View>
      </View>

      {picker === "from" && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          maximumDate={toDate}
          onValueChange={(_, date) => {
            setPicker(null);
            if (date) setFromDate(date);
          }}
        />
      )}

      {picker === "to" && (
        <DateTimePicker
          value={toDate}
          mode="date"
          minimumDate={fromDate}
          maximumDate={new Date()}
          onValueChange={(_, date) => {
            setPicker(null);
            if (date) setToDate(date);
          }}
        />
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total spend</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(getTotalSpend(expenses))}
        </Text>
        <Text style={styles.summaryMeta}>
          {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
        </Text>
      </View>

      <Text style={commonStyles.label}>View by nature</Text>
      <View style={styles.segmentedControl}>
        {Object.values(ExpenseNature).map((nature) => (
          <Pressable
            key={nature}
            onPress={() => setSelectedNature(nature)}
            style={[
              styles.segment,
              selectedNature === nature && styles.segmentSelected,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                selectedNature === nature && styles.segmentTextSelected,
              ]}
            >
              {nature}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.muted}>
          {expensesForSelectedNature.length}{" "}
          {expensesForSelectedNature.length === 1 ? "expense" : "expenses"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : categoryBreakdown.length === 0 ? (
        <View style={commonStyles.card}>
          <Text style={styles.emptyTitle}>No expenses found</Text>
          <Text style={styles.muted}>Try another date range or nature.</Text>
        </View>
      ) : (
        categoryBreakdown.map((item) => (
          <Pressable
            key={`${item.nature}-${item.category}`}
            onPress={() =>
              router.push({
                pathname: "/category-expenses" as never,
                params: {
                  from: fromDate.toISOString(),
                  to: toDate.toISOString(),
                  nature: item.nature,
                  category: item.category,
                  total: String(item.total),
                },
              })
            }
            style={({ pressed }) => [
              commonStyles.card,
              styles.categoryCard,
              pressed && styles.pressed,
            ]}
          >
            <View>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text style={styles.muted}>
                {item.count} {item.count === 1 ? "expense" : "expenses"}
              </Text>
            </View>
            <Text style={styles.categoryTotal}>
              {formatCurrency(item.total)} ›
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dateField: {
    backgroundColor: colors.background,
    borderRadius: 12,
    flex: 1,
    padding: 12,
  },
  dateLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  dateValue: {
    color: colors.text,
    fontSize: 15,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
  },
  summaryLabel: {
    color: "#DDE2FF",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 6,
  },
  summaryMeta: {
    color: "#DDE2FF",
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  segment: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  segmentSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
  segmentTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  categoryCard: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryTotal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.7,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  error: {
    color: colors.danger,
  },
});
