import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";
import * as Crypto from "expo-crypto";
import DateTimePicker from "@react-native-community/datetimepicker";
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

import { SQLiteExpenseRepository } from "../repositories/SQLiteExpenseRepository";
import { colors, commonStyles, formatDate, spacing } from "../theme";
import SelectField from "./SelectField";

const expenseRepository = new SQLiteExpenseRepository();

export default function ExpenseForm() {
  const [nature, setNature] = useState(ExpenseNature.Essential);
  const [category, setCategory] = useState(ExpenseCategory.Other);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveExpense() {
    const parsedAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than ₹0.");
      return;
    }

    setError("");
    setSaving(true);

    const expense: Expense = {
      id: Crypto.randomUUID(),
      nature,
      category,
      amount: parsedAmount,
      description: description.trim(),
      date,
    };

    try {
      await expenseRepository.save(expense);
      Alert.alert("Saved", "Expense saved!");
      setAmount("");
      setDescription("");
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

        <Text style={commonStyles.label}>Nature</Text>
        <View style={styles.segmentedControl}>
          {Object.values(ExpenseNature).map((value) => (
            <Pressable
              key={value}
              onPress={() => setNature(value)}
              style={[
                styles.segment,
                nature === value && styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  nature === value && styles.segmentTextSelected,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <SelectField
          label="Category"
          value={category}
          options={Object.values(ExpenseCategory)}
          onChange={setCategory}
        />

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

        <Text style={commonStyles.label}>Date</Text>
        <Pressable
          style={commonStyles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.fieldValue}>{formatDate(date)}</Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onValueChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

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

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={saving}
          onPress={saveExpense}
          style={[styles.save, saving && styles.disabled]}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving…" : "Save expense"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  fieldValue: {
    color: colors.text,
    fontSize: 16,
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
