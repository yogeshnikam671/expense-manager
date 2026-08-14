import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, commonStyles, spacing } from "../theme";

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

export default function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={commonStyles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[commonStyles.input, styles.select]}
      >
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>

            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[styles.option, option === value && styles.selectedOption]}
              >
                <Text
                  style={[
                    styles.optionText,
                    option === value && styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    alignItems: "center",
    flexDirection: "row",
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  value: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
  },
  chevron: {
    color: colors.muted,
    fontSize: 20,
  },
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: spacing.sm,
    padding: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  option: {
    borderRadius: 10,
    padding: 14,
  },
  selectedOption: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: "700",
  },
});
