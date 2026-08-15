import { ExpenseHistorySummary, ExpenseNature } from "@/models/expense";
import { getHistorySummary } from "@/repositories/expenses";
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
import DatePickerModal from "./DatePickerModal";
import NatureSelector from "./NatureSelector";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const EMPTY_SUMMARY: ExpenseHistorySummary = {
  total: 0,
  count: 0,
  categories: [],
};

export default function HistoryScreen() {
  const [fromDate, setFromDate] = useState(startOfMonth());
  const [toDate, setToDate] = useState(new Date());
  const [selectedNature, setSelectedNature] = useState(ExpenseNature.Essential);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      setSummary(EMPTY_SUMMARY);

      getHistorySummary(fromDate, toDate)
        .then((result) => {
          if (active) setSummary(result);
        })
        .catch(() => {
          if (active) setError("Could not load history. Try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [fromDate, toDate, reload])
  );

  const categoryBreakdown = summary.categories.filter(
    (item) => item.nature === selectedNature
  );
  const selectedNatureCount = categoryBreakdown.reduce(
    (count, item) => count + item.count,
    0
  );

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

      <View style={commonStyles.summaryCard}>
        <Text style={commonStyles.summaryLabel}>Total spend</Text>
        <Text style={commonStyles.summaryValue}>
          {formatCurrency(summary.total)}
        </Text>
        <Text style={styles.summaryMeta}>
          {summary.count} {summary.count === 1 ? "expense" : "expenses"}
        </Text>
      </View>

      <NatureSelector
        label="View by nature"
        value={selectedNature}
        onChange={setSelectedNature}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.muted}>
          {selectedNatureCount}{" "}
          {selectedNatureCount === 1 ? "expense" : "expenses"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <View style={styles.errorBlock}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReload((value) => value + 1)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
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
      <DatePickerModal
        value={picker === "from" ? fromDate : toDate}
        minimumDate={picker === "to" ? fromDate : undefined}
        maximumDate={picker === "from" ? toDate : new Date()}
        visible={picker !== null}
        onChange={(date) => {
          if (picker === "from") setFromDate(date);
          if (picker === "to") setToDate(date);
        }}
        onClose={() => setPicker(null)}
      />
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
  summaryMeta: {
    color: "#DDE2FF",
    marginTop: 4,
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
