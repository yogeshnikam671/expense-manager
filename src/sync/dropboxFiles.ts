import {
  applySyncedExpenses,
  getExpenseBuckets,
  getExpensesInBucket,
  tombstoneExpenseBuckets,
} from "@/repositories/expenses";
import { getSyncMetadata, setSyncMetadata } from "@/storage/database";
import {
  dropboxFetch,
  dropboxResponseError,
  getDropboxAccount,
  getValidDropboxAccessToken,
} from "@/sync/dropboxAuth";
import {
  mergeExpenses,
  parseBucketSyncDocument,
  parseSyncDocument,
  serializeSyncDocument,
} from "@/sync/syncDocument";
import {
  createSyncEncryptionKey,
  decryptSyncDocument,
  encryptSyncDocument,
  getSyncRecoveryKey,
  SyncEncryptionKeyError,
} from "@/sync/syncEncryption";

const API = "https://api.dropboxapi.com/2";
const CONTENT_API = "https://content.dropboxapi.com/2";
const ACCOUNT_ID_KEY = "dropbox.accountId";
const CURSOR_KEY = "dropbox.expenseBuckets.cursor";
const FORMAT_KEY = "dropbox.expenseBuckets.format";
const KEY_MARKER_METADATA_KEY = "dropbox.expenseBuckets.keyMarker";
const FORMAT_VERSION = "2";
const FILE_PREFIX = "expenses-v2-";
const FILE_PATTERN = /^expenses-v2-(\d{4}-(?:0[1-9]|1[0-2]))\.enc$/i;
const KEY_MARKER_NAME = "expenses-v2-key.enc";
const KEY_MARKER_PATH = `/${KEY_MARKER_NAME}`;
const MAX_SYNC_ATTEMPTS = 3;

type DropboxErrorBody = {
  error?: {
    ".tag"?: string;
    path?: { ".tag"?: string; conflict?: { ".tag"?: string } };
  };
};

type DropboxEntry = {
  ".tag": "file" | "folder" | "deleted";
  name: string;
  id?: string;
  path_lower?: string;
  rev?: string;
};

type ListFolderResult = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

export type SyncProgress = {
  label: string;
  detail?: string;
  completed?: number;
  total?: number;
};

export type MissingBucketResolution = "restore" | "delete";

export class DropboxBucketsDeletedError extends Error {
  constructor(readonly buckets: string[]) {
    super(`${buckets.length === 1 ? `Dropbox bucket ${buckets[0]}` : `${buckets.length} Dropbox buckets`} deleted. Local data was kept.`);
  }
}

class DropboxConflictError extends Error {}

function report(
  onProgress: ((progress: SyncProgress) => void) | undefined,
  label: string,
  completed?: number,
  total?: number,
  detail?: string
): void {
  onProgress?.({ label, detail, completed, total });
}

async function dropboxErrorBody(response: Response): Promise<DropboxErrorBody | null> {
  return response.clone().json().catch(() => null) as Promise<DropboxErrorBody | null>;
}

function bucketPath(bucket: string): string {
  return `/${FILE_PREFIX}${bucket}.enc`;
}

export function formatSyncBucket(bucket: string): string {
  return new Date(`${bucket}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function recordCount(count: number): string {
  return `${count} ${count === 1 ? "record" : "records"}`;
}

function bucketFromEntry(entry: DropboxEntry): string | null {
  return FILE_PATTERN.exec(entry.name)?.[1] ?? null;
}

function bucketRevisionKey(bucket: string): string {
  return `dropbox.expenseBuckets.rev.${bucket}`;
}

function parseListFolderResult(value: unknown): ListFolderResult {
  if (!value || typeof value !== "object") throw new Error("Dropbox file list is invalid");
  const result = value as Partial<ListFolderResult>;
  if (!Array.isArray(result.entries) || typeof result.cursor !== "string" || typeof result.has_more !== "boolean") {
    throw new Error("Dropbox file list is invalid");
  }
  if (result.entries.some((entry) =>
    !entry || typeof entry !== "object" || typeof entry.name !== "string"
    || !["file", "folder", "deleted"].includes(entry[".tag"])
  )) throw new Error("Dropbox file list is invalid");
  return result as ListFolderResult;
}

async function listDropboxChanges(
  accessToken: string,
  savedCursor?: string
): Promise<{ entries: DropboxEntry[]; cursor: string; full: boolean }> {
  const full = !savedCursor;
  let cursor = savedCursor;
  const entries: DropboxEntry[] = [];

  while (true) {
    const response = await dropboxFetch(
      `${API}/files/${cursor ? "list_folder/continue" : "list_folder"}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cursor
          ? { cursor }
          : { path: "", recursive: false, include_deleted: true }),
      }
    );
    if (!response.ok) {
      const body = await dropboxErrorBody(response);
      if (savedCursor && response.status === 409 && body?.error?.[".tag"] === "reset") {
        return listDropboxChanges(accessToken);
      }
      throw await dropboxResponseError(response, "Could not list Dropbox sync files");
    }

    const page = parseListFolderResult(await response.json());
    entries.push(...page.entries);
    cursor = page.cursor;
    if (!page.has_more) return { entries, cursor, full };
  }
}

async function downloadBucket(accessToken: string, entry: DropboxEntry): Promise<string> {
  const path = entry.id ?? entry.path_lower;
  if (!path) throw new Error("Dropbox bucket metadata is invalid");
  const response = await dropboxFetch(`${CONTENT_API}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });
  if (!response.ok) throw await dropboxResponseError(response, "Could not download Dropbox bucket");
  return response.text();
}

async function uploadDocument(
  accessToken: string,
  path: string,
  document: string,
  rev?: string
): Promise<string> {
  const response = await dropboxFetch(`${CONTENT_API}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
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
    throw await dropboxResponseError(response, "Could not upload Dropbox bucket");
  }
  const metadata = await response.json() as { rev?: string };
  if (!metadata.rev) throw new Error("Dropbox upload returned no revision");
  return metadata.rev;
}

function latestBucketChanges(entries: DropboxEntry[]): Map<string, DropboxEntry> {
  const latest = new Map<string, DropboxEntry>();
  for (const entry of entries) {
    const bucket = bucketFromEntry(entry);
    if (bucket) latest.set(bucket, entry);
  }
  return latest;
}

function latestEntry(entries: DropboxEntry[], name: string): DropboxEntry | undefined {
  return entries.reduce<DropboxEntry | undefined>(
    (latest, entry) => entry.name.toLowerCase() === name.toLowerCase() ? entry : latest,
    undefined
  );
}

async function syncAttempt(
  accessToken: string,
  onProgress: ((progress: SyncProgress) => void) | undefined,
  onRecoveryKey: (key: string) => void,
  missingBucketResolution?: MissingBucketResolution
): Promise<void> {
  report(onProgress, "Checking Dropbox");
  const configured = getSyncMetadata(FORMAT_KEY) === FORMAT_VERSION;
  const keyMarkerReady = getSyncMetadata(KEY_MARKER_METADATA_KEY) === FORMAT_VERSION;
  const savedCursor = configured && keyMarkerReady
    ? getSyncMetadata(CURSOR_KEY) ?? undefined
    : undefined;
  const listing = await listDropboxChanges(accessToken, savedCursor);
  const changes = latestBucketChanges(listing.entries);
  const keyMarker = latestEntry(listing.entries, KEY_MARKER_NAME);
  const allLocalBuckets = !configured || listing.full ? await getExpenseBuckets() : [];
  const missingBuckets = new Set<string>();

  for (const [bucket, entry] of changes) {
    if (entry[".tag"] !== "deleted") continue;
    if ((await getExpensesInBucket(bucket)).length > 0) {
      missingBuckets.add(bucket);
    }
    setSyncMetadata(bucketRevisionKey(bucket), null);
  }

  if (listing.full && configured) {
    for (const bucket of allLocalBuckets) {
      if (getSyncMetadata(bucketRevisionKey(bucket)) && !changes.has(bucket)) {
        missingBuckets.add(bucket);
        setSyncMetadata(bucketRevisionKey(bucket), null);
      }
    }
  }

  if (missingBuckets.size > 0 && !missingBucketResolution) {
    throw new DropboxBucketsDeletedError([...missingBuckets]);
  }
  if (missingBucketResolution === "delete") {
    await tombstoneExpenseBuckets([...missingBuckets]);
  }

  const remoteFiles = [...changes.entries()].filter(
    (entry): entry is [string, DropboxEntry] => entry[1][".tag"] === "file"
  );
  if (!await getSyncRecoveryKey()) {
    if (!configured && remoteFiles.length === 0 && keyMarker?.[".tag"] !== "file") {
      onRecoveryKey(await createSyncEncryptionKey());
    } else {
      setSyncMetadata(FORMAT_KEY, null);
      setSyncMetadata(KEY_MARKER_METADATA_KEY, null);
      throw new SyncEncryptionKeyError("Recovery key required to sync Dropbox data.");
    }
  }

  if (keyMarker?.[".tag"] === "file") {
    const marker = parseSyncDocument(
      await decryptSyncDocument(await downloadBucket(accessToken, keyMarker))
    );
    if (marker.length !== 0) throw new Error("Dropbox key marker is invalid");
  }
  const markerMissing = (listing.full && keyMarker?.[".tag"] !== "file")
    || keyMarker?.[".tag"] === "deleted";
  let markerSaved = false;
  if (markerMissing && remoteFiles.length === 0) {
    report(onProgress, "Saving encryption marker");
    await uploadDocument(
      accessToken,
      KEY_MARKER_PATH,
      await encryptSyncDocument(serializeSyncDocument([]))
    );
    markerSaved = true;
  }

  const dirtyBuckets = new Set(configured ? await getExpenseBuckets(true) : allLocalBuckets);
  for (const bucket of missingBuckets) dirtyBuckets.add(bucket);
  const uploads = new Map<string, { expenses: Awaited<ReturnType<typeof getExpensesInBucket>>; rev?: string }>();

  for (const [index, [bucket, entry]] of remoteFiles.entries()) {
    const month = formatSyncBucket(bucket);
    report(onProgress, "Downloading", index, remoteFiles.length, month);
    if (!entry.rev) throw new Error("Dropbox bucket metadata is invalid");
    const remote = parseBucketSyncDocument(
      bucket,
      await decryptSyncDocument(await downloadBucket(accessToken, entry))
    );
    report(
      onProgress,
      "Merging",
      index,
      remoteFiles.length,
      `${month} · ${recordCount(remote.length)} from Dropbox`
    );
    const local = await getExpensesInBucket(bucket);
    const merged = mergeExpenses(local, remote);
    report(
      onProgress,
      "Merging",
      index + 1,
      remoteFiles.length,
      `${month} · ${recordCount(merged.length)}`
    );
    setSyncMetadata(bucketRevisionKey(bucket), entry.rev);

    if (serializeSyncDocument(merged) === serializeSyncDocument(remote)) {
      await applySyncedExpenses(merged);
      dirtyBuckets.delete(bucket);
    } else {
      uploads.set(bucket, { expenses: merged, rev: entry.rev });
    }
  }

  for (const bucket of dirtyBuckets) {
    if (uploads.has(bucket)) continue;
    const expenses = await getExpensesInBucket(bucket);
    if (expenses.length > 0) {
      uploads.set(bucket, {
        expenses,
        rev: getSyncMetadata(bucketRevisionKey(bucket)) ?? undefined,
      });
    }
  }

  if (markerMissing && !markerSaved) {
    report(onProgress, "Saving encryption marker");
    await uploadDocument(
      accessToken,
      KEY_MARKER_PATH,
      await encryptSyncDocument(serializeSyncDocument([]))
    );
  }

  const pendingUploads = [...uploads.entries()];
  for (const [index, [bucket, upload]] of pendingUploads.entries()) {
    const detail = `${formatSyncBucket(bucket)} · ${recordCount(upload.expenses.length)}`;
    report(onProgress, "Uploading", index, pendingUploads.length, detail);
    const rev = await uploadDocument(
      accessToken,
      bucketPath(bucket),
      await encryptSyncDocument(serializeSyncDocument(upload.expenses)),
      upload.rev
    );
    setSyncMetadata(bucketRevisionKey(bucket), rev);
    await applySyncedExpenses(upload.expenses);
    report(onProgress, "Uploading", index + 1, pendingUploads.length, detail);
  }

  report(onProgress, "Saving sync state");
  setSyncMetadata(CURSOR_KEY, listing.cursor);
  setSyncMetadata(FORMAT_KEY, FORMAT_VERSION);
  setSyncMetadata(KEY_MARKER_METADATA_KEY, FORMAT_VERSION);
}

export async function syncDropboxExpenses(
  onProgress?: (progress: SyncProgress) => void,
  missingBucketResolution?: MissingBucketResolution
): Promise<{ recoveryKey?: string }> {
  report(onProgress, "Connecting to Dropbox");
  const accessToken = await getValidDropboxAccessToken();
  const { accountId } = await getDropboxAccount(accessToken);
  const linkedAccountId = getSyncMetadata(ACCOUNT_ID_KEY);
  if (linkedAccountId && linkedAccountId !== accountId) {
    throw new Error("Local expenses are linked to another Dropbox account");
  }
  if (!linkedAccountId) setSyncMetadata(ACCOUNT_ID_KEY, accountId);

  let recoveryKey: string | undefined;
  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
    try {
      await syncAttempt(
        accessToken,
        onProgress,
        (key) => { recoveryKey ??= key; },
        missingBucketResolution
      );
      return { recoveryKey };
    } catch (error) {
      if (!(error instanceof DropboxConflictError) || attempt === MAX_SYNC_ATTEMPTS) throw error;
      report(onProgress, `Resolving conflict (${attempt}/${MAX_SYNC_ATTEMPTS})`);
    }
  }
  throw new Error("Dropbox sync failed");
}
