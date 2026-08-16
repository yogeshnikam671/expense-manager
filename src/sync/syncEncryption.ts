import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  parseEncryptedSyncDocument,
  serializeEncryptedSyncDocument,
} from "@/sync/syncDocument";

const SYNC_KEY = "dropbox.encryptionKey";

export class SyncEncryptionKeyError extends Error {}

async function importEncryptionKey(recoveryKey: string): Promise<AESEncryptionKey> {
  try {
    const key = await AESEncryptionKey.import(recoveryKey, "base64");
    if (key.size !== 256) throw new Error();
    return key as AESEncryptionKey;
  } catch {
    throw new Error("Invalid recovery key");
  }
}

export async function getSyncRecoveryKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SYNC_KEY);
}

export async function importSyncRecoveryKey(input: string): Promise<void> {
  const recoveryKey = input.replace(/\s/g, "");
  await importEncryptionKey(recoveryKey);
  await SecureStore.setItemAsync(SYNC_KEY, recoveryKey);
}

export async function createSyncEncryptionKey(): Promise<string> {
  const key = await AESEncryptionKey.generate(256);
  const recoveryKey = await key.encoded("base64");
  await SecureStore.setItemAsync(SYNC_KEY, recoveryKey);
  return recoveryKey;
}

async function encryptionKey(): Promise<AESEncryptionKey> {
  const recoveryKey = await getSyncRecoveryKey();
  if (!recoveryKey) {
    throw new SyncEncryptionKeyError(
      "Recovery key required to decrypt this Dropbox backup."
    );
  }
  return importEncryptionKey(recoveryKey);
}

export async function encryptSyncDocument(document: string): Promise<string> {
  const sealed = await aesEncryptAsync(new TextEncoder().encode(document), await encryptionKey());
  return serializeEncryptedSyncDocument(await sealed.combined("base64"));
}

export async function decryptSyncDocument(document: string): Promise<string> {
  const data = parseEncryptedSyncDocument(document);
  try {
    const sealed = AESSealedData.fromCombined(data);
    const plaintext = await aesDecryptAsync(sealed, await encryptionKey());
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    if (error instanceof SyncEncryptionKeyError) throw error;
    throw new SyncEncryptionKeyError("Could not decrypt Dropbox data. Restore recovery key.");
  }
}
