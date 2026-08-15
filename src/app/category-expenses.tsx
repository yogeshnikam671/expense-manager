import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";
import { ExpenseCursor } from "@/models/expenseSummary";
import { useExpenses } from "@/contexts/ExpenseContext";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

export default function CategoryExpensesScreen() {
  const params = useLocalSearchParams();
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const nature = typeof params.nature === "string" ? params.nature : "";
  const category = typeof params.category === "string" ? params.category : "";
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  const validParams =
    Number.isFinite(fromTime) &&
    Number.isFinite(toTime) &&
    fromTime <= toTime &&
    Object.values(ExpenseNature).includes(nature as ExpenseNature) &&
    Object.values(ExpenseCategory).includes(category as ExpenseCategory);
  const [categoryExpenses, setCategoryExpenses] = useState<Expense[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<ExpenseCursor>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const loadingMoreRef = useRef(false);

  const { getCategoryPage } = useExpenses();

  useEffect(() => {
    const requestGeneration = ++generation.current;
    setLoading(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setError("");
    setCategoryExpenses([]);
    setCategoryTotal(0);
    setNextCursor(undefined);

    if (!validParams) {
      setLoading(false);
      setError("Invalid expense filters.");
      return () => {
        generation.current += 1;
      };
    }

    getCategoryPage(
      new Date(fromTime),
      new Date(toTime),
      nature as ExpenseNature,
      category as ExpenseCategory
    )
      .then((page) => {
        if (requestGeneration === generation.current) {
          if (page.reset) {
            setReload((value) => value + 1);
            return;
          }
          setCategoryExpenses(page.items);
          setCategoryTotal(page.total ?? 0);
          setNextCursor(page.nextCursor);
        }
      })
      .catch(() => {
        if (requestGeneration === generation.current) {
          setError("Could not load expenses.");
        }
      })
      .finally(() => {
        if (requestGeneration === generation.current) setLoading(false);
      });

    return () => {
      generation.current += 1;
    };
  }, [
    category,
    fromTime,
    getCategoryPage,
    nature,
    reload,
    toTime,
    validParams,
  ]);

  const loadMore = useCallback(async () => {
    if (!validParams || loading || loadingMoreRef.current || !nextCursor) return;

    const requestGeneration = generation.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getCategoryPage(
        new Date(fromTime),
        new Date(toTime),
        nature as ExpenseNature,
        category as ExpenseCategory,
        nextCursor
      );
      if (requestGeneration === generation.current) {
        if (page.reset) {
          setReload((value) => value + 1);
          return;
        }
        setCategoryExpenses((current) => [...current, ...page.items]);
        setNextCursor(page.nextCursor);
      }
    } catch {
      if (requestGeneration === generation.current) {
        setError("Could not load more expenses.");
      }
    } finally {
      if (requestGeneration === generation.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [
    category,
    fromTime,
    getCategoryPage,
    loading,
    nature,
    nextCursor,
    toTime,
    validParams,
  ]);

  const errorWithRetry = error ? (
    <View style={styles.errorBlock}>
      <Text style={styles.error}>{error}</Text>
      {validParams ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setReload((value) => value + 1)}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;
  const dateRangeLabel = validParams
    ? `${nature} · ${formatDate(new Date(fromTime))} – ${formatDate(new Date(toTime))}`
    : "Invalid expense filters";

  return (
    <SafeAreaView style={commonStyles.screen} edges={["bottom"]}>
      <FlatList
        data={categoryExpenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <View style={styles.headerBlock}>
              <Text style={commonStyles.title}>{category}</Text>
              <Text style={commonStyles.subtitle}>{dateRangeLabel}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expense</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(categoryTotal)}
              </Text>
            </View>

            <Text style={styles.listTitle}>Expenses</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            errorWithRetry
          ) : (
            <View style={commonStyles.card}>
              <Text style={styles.emptyTitle}>No expenses found</Text>
              <Text style={styles.muted}>This category has no matching entries.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} />
          ) : error && categoryExpenses.length > 0 ? (
            errorWithRetry
          ) : null
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
            {item.labels.length > 0 ? (
              <View style={styles.labels}>
                {item.labels.map((label) => (
                  <View key={label} style={styles.labelChip}>
                    <Text style={styles.labelText}>{label}</Text>
                  </View>
                ))}
              </View>
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
    marginVertical: 20,
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
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  labelChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  labelText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
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
  errorBlock: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
