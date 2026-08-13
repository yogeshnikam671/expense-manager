import {
  Expense,
  ExpenseCategory,
  ExpenseNature,
} from "@/models/expense";
import * as Crypto from "expo-crypto";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Button,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import SelectField from "./SelectField";
import { SQLiteExpenseRepository } from "../repositories/SQLiteExpenseRepository";

const expenseRepository = new SQLiteExpenseRepository();

export default function ExpenseForm() {
  const [nature, setNature] = useState<ExpenseNature>(
    ExpenseNature.Essential
  );

  const [category, setCategory] = useState<ExpenseCategory>(
    ExpenseCategory.Other
  );

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());

  const saveExpense = async () => {
    const expense: Expense = {
      id: Crypto.randomUUID(),
      nature,
      category,
      amount: Number(amount),
      description,
      date,
    };

    await expenseRepository.save(expense);
  };

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text>Nature</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Object.values(ExpenseNature).map((value) => (
          <Pressable
            key={value}
            onPress={() => setNature(value)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: nature === value ? "#ddd" : "white",
            }}
          >
            <Text>{value}</Text>
          </Pressable>
        ))}
      </View>


      <SelectField
        label="Category"
        value={category}
        options={Object.values(ExpenseCategory)}
        onChange={setCategory}
      />

      <Text>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="500"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
        }}
      />


      <Text>Date</Text>
      <DateTimePicker
        value={date}
        mode="date"
        maximumDate={new Date()}
        onValueChange={(_, selectedDate) => {
          if (selectedDate) setDate(selectedDate);
        }}
      />


      <Text>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Lunch with friends"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
        }}
      />

      <Button title="Save" onPress={saveExpense} />
    </View>
  );
}
