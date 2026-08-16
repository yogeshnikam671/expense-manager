export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path);
    if (url.protocol === "expensemanager:" && url.hostname === "oauth") return null;
  } catch {}
  return path;
}
