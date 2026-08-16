import {
  applySyncedExpenses,
  getAllExpenses,
} from "@/repositories/expenses";
import { getSyncMetadata, setSyncMetadata } from "@/storage/database";
import {
  DROPBOX_SYNC_FILE,
  dropboxResponseError,
  getDropboxAccount,
  getValidDropboxAccessToken,
} from "@/sync/dropboxAuth";
import {
  mergeExpenses,
  parseSyncDocument,
  serializeSyncDocument,
} from "@/sync/syncDocument";
import {
  createSyncEncryptionKey,
  decryptSyncDocument,
  encryptSyncDocument,
  getSyncRecoveryKey,
} from "@/sync/syncEncryption";

const CONTENT_API = "https://content.dropboxapi.com/2";
const ACCOUNT_ID_KEY = "dropbox.accountId";
const MAX_SYNC_ATTEMPTS = 3;

type DropboxErrorBody = {
  error?: {
    ".tag"?: string;
    path?: { ".tag"?: string; conflict?: { ".tag"?: string } };
  };
};

class DropboxConflictError extends Error {}

async function dropboxErrorBody(response: Response): Promise<DropboxErrorBody | null> {
  return response.clone().json().catch(() => null) as Promise<DropboxErrorBody | null>;
}

export async function uploadSyncDocument(accessToken: string, document: string, rev?: string): Promise<void> {
  const response = await fetch(`${CONTENT_API}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: DROPBOX_SYNC_FILE,
        mode: rev ? { ".tag": "update", update: rev } : { ".tag": "add" },
        autorename: false,
        strict_conflict: true,
        mute: true,
      }),
    },
    body: document,
  });
  if (!response.ok) {
    const body = await dropboxErrorBody(response);
    const conflict = body?.error?.[".tag"] === "path"
      && body.error.path?.[".tag"] === "conflict"
      && body.error.path.conflict?.[".tag"] === "file";
    if (response.status === 409 && conflict) throw new DropboxConflictError("Dropbox sync conflict");
    throw await dropboxResponseError(response, "Could not upload Dropbox sync file");
  }
}

export async function downloadSyncDocument(accessToken: string): Promise<{ document: string; rev: string } | null> {
  const response = await fetch(`${CONTENT_API}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: DROPBOX_SYNC_FILE }),
    },
  });
  if (!response.ok) {
    const body = await dropboxErrorBody(response);
    const notFound = body?.error?.[".tag"] === "path"
      && body.error.path?.[".tag"] === "not_found";
    if (response.status === 409 && notFound) return null;
    throw await dropboxResponseError(response, "Could not download Dropbox sync file");
  }
  const metadataHeader = response.headers.get("Dropbox-API-Result");
  const metadata = metadataHeader ? JSON.parse(metadataHeader) as { rev?: string } : null;
  const document = await response.text();
  if (!metadata?.rev) throw new Error("Dropbox download returned no revision");
  return { document, rev: metadata.rev };
}

export async function syncDropboxExpenses(): Promise<{ recoveryKey?: string }> {
  const accessToken = await getValidDropboxAccessToken();
  const { accountId } = await getDropboxAccount(accessToken);
  const linkedAccountId = getSyncMetadata(ACCOUNT_ID_KEY);
  if (linkedAccountId && linkedAccountId !== accountId) {
    throw new Error("Local expenses are linked to another Dropbox account");
  }
  if (!linkedAccountId) setSyncMetadata(ACCOUNT_ID_KEY, accountId);

  let recoveryKey: string | undefined;
  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
    const local = await getAllExpenses();
    const cloud = await downloadSyncDocument(accessToken);
    if (!cloud) recoveryKey ??= await getSyncRecoveryKey() ?? await createSyncEncryptionKey();
    const merged = mergeExpenses(
      local,
      cloud ? parseSyncDocument(await decryptSyncDocument(cloud.document)) : []
    );

    try {
      await uploadSyncDocument(
        accessToken,
        await encryptSyncDocument(serializeSyncDocument(merged)),
        cloud?.rev
      );
      await applySyncedExpenses(merged);
      return { recoveryKey };
    } catch (error) {
      if (!(error instanceof DropboxConflictError) || attempt === MAX_SYNC_ATTEMPTS) throw error;
    }
  }
  throw new Error("Dropbox sync failed");
}
