export function parseExpenseLabels(input: string): string[] {
  const labels: string[] = [];

  for (const rawLabel of input.split(",")) {
    const label = rawLabel.trim().toLowerCase();
    if (!label) continue;
    if (!/^[a-z]+$/.test(label)) {
      throw new Error("Labels can contain letters only.");
    }
    if (!labels.includes(label)) labels.push(label);
  }

  return labels;
}

export function labelsFromDatabase(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const labels = JSON.parse(value);
    return Array.isArray(labels) && labels.every((label) => typeof label === "string")
      ? labels
      : [];
  } catch {
    return [];
  }
}
