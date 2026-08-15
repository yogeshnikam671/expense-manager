import { StyleSheet } from "react-native";

export const colors = {
  background: "#F6F7FB",
  card: "#FFFFFF",
  primary: "#4F46E5",
  primarySoft: "#EEF2FF",
  text: "#182033",
  muted: "#697386",
  border: "#E2E6EF",
  danger: "#B42318",
};

export const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
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
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});

export function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
