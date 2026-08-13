import { Modal, Pressable, Text, View } from "react-native";
import { useState } from "react";

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
    <>
      <Text>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <Text>{value} ▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              gap: 8,
            }}
          >
            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: option === value ? "#eee" : "white",
                }}
              >
                <Text>{option}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
