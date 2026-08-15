import { EXPENSE_NATURES, ExpenseNature } from "@/models/expense";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, commonStyles, spacing } from "../theme";

type Props = {
  label: string;
  value: ExpenseNature;
  onChange: (value: ExpenseNature) => void;
};

export default function NatureSelector({ label, value, onChange }: Props) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={commonStyles.label}>{label}</Text>
      <View style={styles.options}>
        {EXPENSE_NATURES.map((nature) => {
          const selected = nature === value;
          return (
            <Pressable
              key={nature}
              onPress={() => onChange(nature)}
              style={[styles.option, selected && styles.selectedOption]}
            >
              <Text style={[styles.text, selected && styles.selectedText]}>
                {nature}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: spacing.sm },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  selectedOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  text: { color: colors.muted, fontSize: 13, textAlign: "center" },
  selectedText: { color: colors.primary, fontWeight: "700" },
});
