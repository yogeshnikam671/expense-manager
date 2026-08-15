import {
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  ExpenseNature,
  SyncStatus,
} from "@/models/expense";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { saveExpense } from "@/repositories/expenses";
import { colors, commonStyles, formatDate, spacing } from "../theme";
import { parseExpenseLabels } from "../utils/expenseLabels";
import DatePickerModal from "./DatePickerModal";
import NatureSelector from "./NatureSelector";
import SelectField from "./SelectField";

export default function ExpenseForm() {
  const [nature, setNature] = useState(ExpenseNature.Essential);
  const [category, setCategory] = useState(ExpenseCategory.Other);
  const [labels, setLabels] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSaveExpense() {
    const parsedAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than ₹0.");
      return;
    }

    let parsedLabels: string[];
    try {
      parsedLabels = parseExpenseLabels(labels);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Enter valid labels.");
      return;
    }

    setError("");
    setSaving(true);

    const now = new Date();
    const expense: Expense = {
      id: Crypto.randomUUID(),
      nature,
      category,
      labels: parsedLabels,
      amount: parsedAmount,
      description: description.trim(),
      date,
      createdAt: now,
      updatedAt: now,
      syncStatus: SyncStatus.PendingCreate,
    };

    try {
      await saveExpense(expense);
      Alert.alert("Saved", "Expense saved!");
      setAmount("");
      setDescription("");
      setLabels("");
    } catch {
      setError("Could not save expense. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={commonStyles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={commonStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={commonStyles.title}>Add expense</Text>
        <Text style={commonStyles.subtitle}>
          Track spending while it is still fresh.
        </Text>

        <NatureSelector label="Nature" value={nature} onChange={setNature} />

        <SelectField
          label="Category"
          value={category}
          options={EXPENSE_CATEGORIES}
          onChange={setCategory}
        />

        <View style={styles.fieldGroup}>
          <Text style={commonStyles.label}>Amount</Text>
          <View style={styles.amountField}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setError("");
              }}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={colors.muted}
              style={styles.amountInput}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={commonStyles.label}>Date</Text>
          <Pressable
            style={commonStyles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateFieldValue}>{formatDate(date)}</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={commonStyles.label}>
            Labels <Text style={styles.optional}>(optional, letters only)</Text>
          </Text>
          <TextInput
            value={labels}
            onChangeText={(value) => {
              setLabels(value);
              setError("");
            }}
            placeholder="client, reimbursable"
            placeholderTextColor={colors.muted}
            style={commonStyles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={commonStyles.label}>
            Description <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Lunch with friends"
            placeholderTextColor={colors.muted}
            multiline
            style={[commonStyles.input, styles.description]}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={saving}
          onPress={onSaveExpense}
          style={[styles.save, saving && styles.disabled]}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving…" : "Save expense"}
          </Text>
        </Pressable>
        <DatePickerModal
          value={date}
          maximumDate={new Date()}
          visible={showDatePicker}
          onChange={setDate}
          onClose={() => setShowDatePicker(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.sm,
  },
  amountField: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingLeft: spacing.md,
  },
  currency: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  amountInput: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    paddingHorizontal: 8,
  },
  dateFieldValue: {
    color: colors.text,
    fontSize: 16,
    marginTop: 14,
  },
  optional: {
    color: colors.muted,
    fontWeight: "400",
  },
  description: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 52,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
});
