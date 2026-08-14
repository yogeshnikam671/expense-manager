import { Expense } from "@/models/expense";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  colors,
  commonStyles,
  formatCurrency,
  formatDate,
  spacing,
} from "../theme";

const repository = new SQLiteExpenseRepository();

export default function CategoryExpensesScreen() {
  const { from, to, nature, category, total } = useLocalSearchParams<{
    from: string;
    to: string;
    nature: string;
    category: string;
    total: string;
  }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    repository
      .getBetween(new Date(from), new Date(to))
      .then((allExpenses) => {
        if (active) {
          setExpenses(
            allExpenses.filter(
              (expense) =>
                expense.nature === nature && expense.category === category
            )
          );
        }
      })
      .catch(() => {
        if (active) setError("Could not load expenses.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [from, to, nature, category]);

  return (
    <SafeAreaView style={commonStyles.screen} edges={["bottom"]}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.headerBlock}>
              <Text style={commonStyles.title}>{category}</Text>
              <Text style={commonStyles.subtitle}>
                {nature} · {formatDate(new Date(from))} – {formatDate(new Date(to))}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Category total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(Number(total))}
              </Text>
            </View>

            <Text style={styles.listTitle}>Expenses</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={commonStyles.card}>
              <Text style={styles.emptyTitle}>No expenses found</Text>
              <Text style={styles.muted}>This category has no matching entries.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            <View style={styles.row}>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              <Text style={styles.muted}>{formatDate(item.date)}</Text>
            </View>
            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerBlock: {
    gap: 4,
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
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
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
