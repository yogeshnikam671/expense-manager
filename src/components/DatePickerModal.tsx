import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../theme";

type DatePickerModalProps = {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  visible: boolean;
  onChange: (date: Date) => void;
  onClose: () => void;
};

export default function DatePickerModal({
  value,
  minimumDate,
  maximumDate,
  visible,
  onChange,
  onClose,
}: DatePickerModalProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  if (!visible) return null;

  if (Platform.OS !== "ios") {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onDismiss={onClose}
        onValueChange={(_, date) => {
          onChange(date);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Select date</Text>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_, date) => setDraft(date)}
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.action}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange(draft);
                onClose();
              }}
              style={[styles.action, styles.done]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    maxWidth: 420,
    padding: spacing.md,
    width: "100%",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  action: {
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  cancel: {
    color: colors.primary,
    fontWeight: "700",
  },
  done: {
    backgroundColor: colors.primary,
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
