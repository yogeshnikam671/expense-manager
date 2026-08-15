import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, commonStyles, spacing } from "../../theme";
import {
  connectDropbox,
  disconnectDropbox,
  DropboxSessionError,
  getDropboxAccount,
  getDropboxTokens,
  getValidDropboxAccessToken,
  hasDropboxAppKey,
  useDropboxAuthRequest,
} from "@/sync/dropboxAuth";
import { syncDropboxExpenses } from "@/sync/dropboxFiles";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";

export default function Settings() {
  const syncSupported = Platform.OS !== "web";
  const [request, response, promptAsync] = useDropboxAuthRequest();
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(syncSupported);
  const [syncMessage, setSyncMessage] = useState("");
  const handledCode = useRef<string | null>(null);

  useEffect(() => {
    if (!syncSupported) return;
    let active = true;
    (async () => {
      try {
        const tokens = await getDropboxTokens();
        if (!tokens) return;
        const account = await getDropboxAccount(
          await getValidDropboxAccessToken()
        );
        if (active) {
          setConnected(true);
          setAccountName(account.displayName);
        }
      } catch {
        if (active) setConnected(false);
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [syncSupported]);

  useEffect(() => {
    if (
      !syncSupported ||
      response?.type !== "success" ||
      !response.params.code ||
      !request?.codeVerifier
    ) {
      return;
    }
    if (handledCode.current === response.params.code) return;
    handledCode.current = response.params.code;
    let active = true;
    setBusy(true);
    connectDropbox(response.params.code, request.codeVerifier)
      .then((tokens) => getDropboxAccount(tokens.accessToken))
      .then((account) => {
        if (active) {
          setConnected(true);
          setAccountName(account.displayName);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          Alert.alert(
            "Dropbox",
            error instanceof Error ? error.message : "Connection failed"
          );
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [request, response, syncSupported]);

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectDropbox();
    } catch (error) {
      Alert.alert("Dropbox", error instanceof Error ? error.message : "Disconnect failed");
    } finally {
      setConnected(false);
      setAccountName("");
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setSyncMessage("");
    try {
      await syncDropboxExpenses(new SQLiteExpenseRepository());
      setSyncMessage("Synced");
    } catch (error) {
      if (error instanceof DropboxSessionError) {
        setConnected(false);
        setAccountName("");
      }
      setSyncMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const connectDisabled =
    !syncSupported || !request || busy || !hasDropboxAppKey();
  const connectLabel = busy
    ? "Working…"
    : connected
      ? "Reconnect Dropbox"
      : "Connect Dropbox";

  return (
    <SafeAreaView style={commonStyles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={commonStyles.content}>
        <Text style={commonStyles.title}>Settings</Text>
        <Text style={commonStyles.subtitle}>Cloud sync</Text>
        {!syncSupported && (
          <Text style={styles.warning}>
            Dropbox sync is available on iOS and Android only.
          </Text>
        )}
        <Text style={styles.status}>
          {connected ? `Connected: ${accountName}` : "Dropbox not connected"}
        </Text>
        {connected && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={syncNow}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.buttonText}>
              {busy ? "Working…" : "Sync now"}
            </Text>
          </Pressable>
        )}
        {!!syncMessage && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {syncMessage}
          </Text>
        )}
        {!hasDropboxAppKey() && (
          <Text style={styles.warning}>
            Add EXPO_PUBLIC_DROPBOX_APP_KEY to enable Dropbox.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={connectDisabled}
          onPress={() => promptAsync()}
          style={[styles.button, connectDisabled && styles.disabled]}
        >
          <Text style={styles.buttonText}>{connectLabel}</Text>
        </Pressable>
        {connected && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={disconnect}
            style={[styles.secondary, busy && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Disconnect</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  status: { color: colors.text, marginBottom: spacing.lg },
  warning: { color: colors.muted, marginBottom: spacing.md },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
  },
  buttonText: { color: "white", fontWeight: "600" },
  secondary: { alignItems: "center", padding: spacing.md },
  secondaryText: { color: colors.primary, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
