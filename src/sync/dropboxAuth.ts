import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const ACCESS_TOKEN_KEY = "dropbox.oauth.accessToken";
const REFRESH_TOKEN_KEY = "dropbox.oauth.refreshToken";
const EXPIRES_AT_KEY = "dropbox.oauth.expiresAt";
const LEGACY_TOKEN_KEY = "dropbox.oauth.tokens";
const DROPBOX_APP_KEY = process.env.EXPO_PUBLIC_DROPBOX_APP_KEY;
const REQUEST_TIMEOUT_MS = 30_000;
const redirectUri = AuthSession.makeRedirectUri({ scheme: "expensemanager", path: "oauth" });
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://www.dropbox.com/oauth2/authorize",
  tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
};

export type DropboxTokens = { accessToken: string; refreshToken?: string; expiresAt?: number };
export class DropboxSessionError extends Error {}

async function withDropboxTimeout<T>(request: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Dropbox request timed out. Try again.")),
          REQUEST_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function dropboxFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Dropbox request timed out. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function clearDropboxTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
  ]);
}

export async function dropboxResponseError(response: Response, fallback: string): Promise<Error> {
  if (response.status === 401) {
    await clearDropboxTokens();
    return new DropboxSessionError("Dropbox session expired. Reconnect Dropbox.");
  }
  if (response.status === 429) return new Error("Dropbox is busy. Try again shortly.");
  if (response.status >= 500) return new Error("Dropbox is unavailable. Try again later.");

  const body = await response.clone().json().catch(() => null) as {
    error_description?: string;
    error_summary?: string;
  } | null;
  const detail = body?.error_description ?? body?.error_summary;
  const requestId = response.headers.get("X-Dropbox-Request-Id");
  return new Error(`${detail ? `${fallback}: ${detail}` : fallback}${requestId ? ` (${requestId})` : ""}`);
}

export function getDropboxAppKey(): string {
  if (!DROPBOX_APP_KEY) throw new Error("Missing EXPO_PUBLIC_DROPBOX_APP_KEY");
  return DROPBOX_APP_KEY;
}

export function hasDropboxAppKey(): boolean {
  return Boolean(DROPBOX_APP_KEY);
}

export async function getDropboxTokens(): Promise<DropboxTokens | null> {
  const [accessToken, refreshToken, expiresAtValue] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRES_AT_KEY),
  ]);
  if (!accessToken) {
    if (refreshToken || expiresAtValue) await clearDropboxTokens();
    return null;
  }
  const expiresAt = expiresAtValue ? Number(expiresAtValue) : undefined;
  if (expiresAtValue && !Number.isFinite(expiresAt)) {
    await clearDropboxTokens();
    return null;
  }
  return { accessToken, refreshToken: refreshToken ?? undefined, expiresAt };
}

async function storeTokens(
  response: Pick<AuthSession.TokenResponse, "accessToken" | "refreshToken" | "expiresIn" | "issuedAt">,
  previousRefreshToken?: string
): Promise<DropboxTokens> {
  const refreshToken = response.refreshToken ?? previousRefreshToken;
  const expiresAt = response.expiresIn
    ? (response.issuedAt + response.expiresIn) * 1000
    : undefined;
  const tokens: DropboxTokens = {
    accessToken: response.accessToken,
    refreshToken,
    expiresAt,
  };
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      refreshToken
        ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
        : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      expiresAt
        ? SecureStore.setItemAsync(EXPIRES_AT_KEY, String(expiresAt))
        : SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
    ]);
  } catch (error) {
    await clearDropboxTokens();
    throw error;
  }
  return tokens;
}

export async function connectDropbox(code: string, codeVerifier: string): Promise<DropboxTokens> {
  try {
    const response = await withDropboxTimeout(AuthSession.exchangeCodeAsync({
      clientId: getDropboxAppKey(),
      code,
      redirectUri,
      extraParams: { code_verifier: codeVerifier },
    }, discovery));
    return await storeTokens(response);
  } catch (error) {
    throw new Error(`Dropbox authorization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getValidDropboxAccessToken(): Promise<string> {
  const tokens = await getDropboxTokens();
  if (!tokens) throw new DropboxSessionError("Dropbox is not connected");
  if (!tokens.refreshToken || !tokens.expiresAt || tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  try {
    const response = await withDropboxTimeout(AuthSession.refreshAsync({
      clientId: getDropboxAppKey(),
      refreshToken: tokens.refreshToken,
    }, discovery));
    return (await storeTokens(response, tokens.refreshToken)).accessToken;
  } catch (error) {
    if (
      error instanceof AuthSession.ResponseError &&
      (error.code === "invalid_grant" || error.code === "invalid_client")
    ) {
      await clearDropboxTokens();
      throw new DropboxSessionError("Dropbox session expired. Reconnect Dropbox.");
    }
    throw new Error(`Could not refresh Dropbox session: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getDropboxAccount(accessToken: string): Promise<{ accountId: string; displayName: string }> {
  const response = await dropboxFetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "null",
  });
  if (!response.ok) throw await dropboxResponseError(response, "Could not verify Dropbox account");
  const account = await response.json() as { account_id?: string; name?: { display_name?: string } };
  if (!account.account_id) throw new Error("Dropbox account response is invalid");
  return {
    accountId: account.account_id,
    displayName: account.name?.display_name ?? "Dropbox account",
  };
}

export async function disconnectDropbox(): Promise<boolean> {
  let accessRevoked = true;
  try {
    const tokens = await getDropboxTokens();
    if (tokens) {
      const accessToken = await getValidDropboxAccessToken();
      const response = await dropboxFetch("https://api.dropboxapi.com/2/auth/token/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw await dropboxResponseError(response, "Could not revoke Dropbox access");
    }
  } catch {
    accessRevoked = false;
  } finally {
    await clearDropboxTokens();
  }
  return accessRevoked;
}

export function useDropboxAuthRequest() {
  return AuthSession.useAuthRequest({
    clientId: DROPBOX_APP_KEY ?? "",
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ["account_info.read", "files.content.read", "files.content.write"],
    usePKCE: true,
    extraParams: { token_access_type: "offline" },
  }, discovery);
}
