import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
import {
  DropboxBucketsDeletedError,
  formatSyncBucket,
  MissingBucketResolution,
  SyncProgress,
  syncDropboxExpenses,
} from "@/sync/dropboxFiles";
import {
  getSyncRecoveryKey,
  importSyncRecoveryKey,
  SyncEncryptionKeyError,
} from "@/sync/syncEncryption";

export default function Settings() {
  const syncSupported = Platform.OS !== "web";
  const [request, response, promptAsync] = useDropboxAuthRequest();
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(syncSupported);
  const [checkingConnection, setCheckingConnection] = useState(syncSupported);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [restoringRecoveryKey, setRestoringRecoveryKey] = useState(false);
  const [hasRecoveryKey, setHasRecoveryKey] = useState(false);
  const handledCode = useRef<string | null>(null);
  const appKeyConfigured = hasDropboxAppKey();

  useEffect(() => {
    if (!syncSupported) return;
    let active = true;
    let hasTokens = false;
    (async () => {
      try {
        const [tokens, recoveryKey] = await Promise.all([
          getDropboxTokens(),
          getSyncRecoveryKey(),
        ]);
        if (active) setHasRecoveryKey(Boolean(recoveryKey));
        if (!tokens) return;
        hasTokens = true;
        const account = await getDropboxAccount(
          await getValidDropboxAccessToken()
        );
        if (active) {
          setConnected(true);
          setAccountName(account.displayName);
          setSyncMessage("");
        }
      } catch (error) {
        if (!active) return;
        if (hasTokens && !(error instanceof DropboxSessionError)) {
          setConnected(true);
          setAccountName("Dropbox account");
          setSyncMessage("Could not verify Dropbox connection. Check internet, then tap Sync now.");
        } else {
          setConnected(false);
        }
      } finally {
        if (active) {
          setCheckingConnection(false);
          setBusy(false);
        }
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
          setSyncMessage("");
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
      const accessRevoked = await disconnectDropbox();
      setConnected(false);
      setAccountName("");
      setRecoveryCode(null);
      setRestoringRecoveryKey(false);
      setSyncMessage("");
      setRecoveryMessage("");
      if (!accessRevoked) {
        Alert.alert(
          "Disconnected on this device",
          "Dropbox access could not be revoked. Remove this app from Connected apps in Dropbox settings."
        );
      }
    } catch (error) {
      Alert.alert(
        "Could not disconnect",
        error instanceof Error ? error.message : "Try again"
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmDisconnect() {
    Alert.alert(
      "Disconnect Dropbox?",
      "Sync will stop. Local expenses and recovery key stay on this device. The encrypted backup stays in Dropbox. You can reconnect this Dropbox account later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: () => void disconnect() },
      ]
    );
  }

  async function syncNow(missingBucketResolution?: MissingBucketResolution) {
    setBusy(true);
    setSyncMessage("");
    setSyncProgress({ label: "Connecting to Dropbox" });
    setRecoveryMessage("");
    try {
      const { recoveryKey } = await syncDropboxExpenses(
        setSyncProgress,
        missingBucketResolution
      );
      if (recoveryKey) {
        setHasRecoveryKey(true);
        setRecoveryCode(recoveryKey);
        setRestoringRecoveryKey(false);
        setSyncMessage("Synced. Save recovery key below.");
      } else {
        setSyncMessage("Synced");
      }
    } catch (error) {
      if (!(error instanceof SyncEncryptionKeyError) && !hasRecoveryKey) {
        const recoveryKey = await getSyncRecoveryKey().catch(() => null);
        if (recoveryKey) {
          setHasRecoveryKey(true);
          setRecoveryCode(recoveryKey);
          setRecoveryMessage("Recovery key created. Save it before retrying sync.");
        }
      }
      if (error instanceof DropboxBucketsDeletedError) {
        const months = error.buckets.map(formatSyncBucket).join(", ");
        Alert.alert(
          "Dropbox data deleted",
          `Dropbox no longer contains ${months}. Restore Dropbox from local data, or delete those local expenses too?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Restore Dropbox", onPress: () => void syncNow("restore") },
            { text: "Delete local", style: "destructive", onPress: () => void syncNow("delete") },
          ]
        );
      }
      if (error instanceof DropboxSessionError) {
        setConnected(false);
        setAccountName("");
      }
      if (error instanceof SyncEncryptionKeyError) {
        setHasRecoveryKey(false);
        setRecoveryCode("");
        setRestoringRecoveryKey(true);
      }
      if (!(error instanceof DropboxBucketsDeletedError)) {
        setSyncMessage(error instanceof Error ? error.message : "Sync failed");
      }
    } finally {
      setSyncProgress(null);
      setBusy(false);
    }
  }

  async function toggleRecoveryKey() {
    setRecoveryMessage("");
    if (recoveryCode !== null) {
      setRecoveryCode(null);
      setRestoringRecoveryKey(false);
      return;
    }
    try {
      const recoveryKey = await getSyncRecoveryKey();
      if (!recoveryKey) {
        setRecoveryMessage("Sync first to create a recovery key");
        return;
      }
      setRecoveryCode(recoveryKey);
    } catch (error) {
      setRecoveryMessage(error instanceof Error ? error.message : "Could not load recovery key");
    }
  }

  async function saveRecoveryKey() {
    setRecoveryMessage("");
    try {
      await importSyncRecoveryKey(recoveryCode ?? "");
      setHasRecoveryKey(true);
      setRecoveryCode(await getSyncRecoveryKey());
      setRestoringRecoveryKey(false);
      setSyncMessage("");
      setRecoveryMessage("Recovery key saved. Tap Sync now.");
    } catch (error) {
      setRecoveryMessage(error instanceof Error ? error.message : "Could not save recovery key");
    }
  }

  async function copyRecoveryKey() {
    if (!recoveryCode) return;
    setRecoveryMessage("");
    try {
      await Clipboard.setStringAsync(recoveryCode);
      setRecoveryMessage("Recovery key copied");
    } catch (error) {
      setRecoveryMessage(error instanceof Error ? error.message : "Could not copy recovery key");
    }
  }

  const connectDisabled =
    !syncSupported || !request || busy || !appKeyConfigured;
  const connectLabel = busy ? "Working…" : "Connect Dropbox";
  const recoveryKeyEmpty = !recoveryCode?.trim();
  const syncPercent = syncProgress?.total
    ? Math.min(100, Math.max(0, Math.round(((syncProgress.completed ?? 0) / syncProgress.total) * 100)))
    : null;

  return (
    <SafeAreaView style={commonStyles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={commonStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={commonStyles.title}>Settings</Text>
        <Text style={commonStyles.subtitle}>Cloud sync</Text>
        <View style={[commonStyles.card, styles.cloudCard]}>
          <Text style={commonStyles.label}>Dropbox</Text>
          <Text style={styles.help}>Encrypted manual sync</Text>
          {!syncSupported ? (
            <Text style={styles.warning}>
              Dropbox sync is available on iOS and Android only.
            </Text>
          ) : connected ? (
            <>
              <Text style={styles.accountStatus}>Connected: {accountName}</Text>
            {!hasRecoveryKey && !restoringRecoveryKey && !syncMessage && (
              <Text style={styles.help}>
                First sync creates an encrypted backup and recovery key.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy || restoringRecoveryKey}
              onPress={() => void syncNow()}
              style={[styles.button, (busy || restoringRecoveryKey) && styles.disabled]}
            >
              <Text style={styles.buttonText}>
                {syncProgress ? "Syncing…" : busy ? "Working…" : "Sync now"}
              </Text>
            </Pressable>
            {!!syncMessage && (
              <Text accessibilityLiveRegion="polite" style={styles.message}>
                {syncMessage}
              </Text>
            )}
            {!!syncProgress && (
              <View accessibilityLiveRegion="polite" style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <ActivityIndicator accessible={false} color={colors.primary} size="small" />
                  <View style={styles.progressCopy}>
                    <Text style={styles.progressLabel}>{syncProgress.label}</Text>
                    {!!syncProgress.detail && (
                      <Text style={styles.help}>{syncProgress.detail}</Text>
                    )}
                  </View>
                  {syncProgress.total !== undefined && (
                    <Text style={styles.progressCount}>
                      {syncProgress.completed ?? 0} of {syncProgress.total}
                    </Text>
                  )}
                </View>
                {syncPercent !== null && (
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: syncPercent }}
                    style={styles.progressTrack}
                  >
                    <View style={[styles.progressFill, { width: `${syncPercent}%` }]} />
                  </View>
                )}
              </View>
            )}
            {hasRecoveryKey && !restoringRecoveryKey && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={toggleRecoveryKey}
                style={[styles.secondary, busy && styles.disabled]}
              >
                <Text style={styles.secondaryText}>
                  {recoveryCode === null ? "View recovery key" : "Hide recovery key"}
                </Text>
              </Pressable>
            )}
            {!!recoveryMessage && recoveryCode === null && !restoringRecoveryKey && (
              <Text accessibilityLiveRegion="polite" style={styles.message}>
                {recoveryMessage}
              </Text>
            )}
            {restoringRecoveryKey && (
              <View style={styles.recovery}>
                <Text style={commonStyles.label}>Restore encrypted backup</Text>
                <Text style={styles.help}>
                  Paste recovery key created on original device.
                </Text>
                <TextInput
                  accessibilityLabel="Dropbox recovery key"
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  onChangeText={setRecoveryCode}
                  placeholder="Paste recovery key"
                  style={[commonStyles.input, styles.recoveryText]}
                  value={recoveryCode ?? ""}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={busy || recoveryKeyEmpty}
                  onPress={saveRecoveryKey}
                  style={[
                    styles.button,
                    (busy || recoveryKeyEmpty) && styles.disabled,
                  ]}
                >
                  <Text style={styles.buttonText}>Save recovery key</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    setRecoveryCode(null);
                    setRestoringRecoveryKey(false);
                    setRecoveryMessage("");
                  }}
                  style={[styles.secondary, busy && styles.disabled]}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                {!!recoveryMessage && (
                  <Text accessibilityLiveRegion="polite" style={styles.message}>
                    {recoveryMessage}
                  </Text>
                )}
              </View>
            )}
            {recoveryCode !== null && !restoringRecoveryKey && (
              <View style={styles.recovery}>
                <Text style={commonStyles.label}>Recovery key</Text>
                <Text style={styles.help}>
                  Save offline. Required after reinstall or on another device.
                </Text>
                <Text
                  accessibilityLabel="Dropbox recovery key"
                  selectable
                  style={[commonStyles.input, styles.recoveryText]}
                >
                  {recoveryCode}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={copyRecoveryKey}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>Copy recovery key</Text>
                </Pressable>
                {!!recoveryMessage && (
                  <Text accessibilityLiveRegion="polite" style={styles.message}>
                    {recoveryMessage}
                  </Text>
                )}
              </View>
            )}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={confirmDisconnect}
                style={[styles.secondary, busy && styles.disabled]}
              >
                <Text style={styles.dangerText}>Disconnect Dropbox</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.accountStatus}>
                {checkingConnection ? "Checking connection…" : "Not connected"}
              </Text>
              {!appKeyConfigured && (
                <Text style={styles.warning}>
                  Add EXPO_PUBLIC_DROPBOX_APP_KEY to enable Dropbox.
                </Text>
              )}
              {!checkingConnection && (
                <Pressable
                  accessibilityRole="button"
                  disabled={connectDisabled}
                  onPress={() => promptAsync()}
                  style={[styles.button, connectDisabled && styles.disabled]}
                >
                  <Text style={styles.buttonText}>{connectLabel}</Text>
                </Pressable>
              )}
              {!!syncMessage && (
                <Text accessibilityLiveRegion="polite" style={styles.message}>
                  {syncMessage}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  warning: { color: colors.muted, marginBottom: spacing.md },
  cloudCard: { gap: spacing.md },
  accountStatus: { color: colors.text },
  message: { color: colors.text },
  progressCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  progressHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  progressCopy: { flex: 1 },
  progressLabel: { color: colors.text, fontWeight: "700" },
  progressCount: { color: colors.primary, fontVariant: ["tabular-nums"], fontWeight: "700" },
  progressTrack: { backgroundColor: colors.border, borderRadius: 4, height: 8, overflow: "hidden" },
  progressFill: { backgroundColor: colors.primary, borderRadius: 4, height: "100%" },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
  },
  buttonText: { color: "white", fontWeight: "600" },
  secondary: { alignItems: "center", padding: spacing.md },
  secondaryText: { color: colors.primary, fontWeight: "600" },
  dangerText: { color: colors.danger, fontWeight: "600" },
  recovery: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  help: { color: colors.muted },
  recoveryText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    paddingVertical: spacing.md,
  },
  disabled: { opacity: 0.5 },
});
