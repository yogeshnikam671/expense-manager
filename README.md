# Expense Manager

Expo app for recording expenses, reviewing category totals, and manually syncing encrypted data through Dropbox.

## Run

```bash
npm install
npm start
```

Checks:

```bash
npm test
npm run typecheck
```

## Publish an Android beta

GitHub releases contain an installable APK. iOS publishing is intentionally not configured yet.

### One-time setup

1. Sign in to Expo and link this repository to an EAS project:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   Commit the `expo.extra.eas.projectId` added to `app.json`.

2. Add the Dropbox app key to the EAS `production` environment. This is a public client identifier, not the Dropbox app secret:

   ```bash
   npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_DROPBOX_APP_KEY --value your-real-app-key --visibility plaintext
   ```

3. Run the first build interactively so EAS can create and store the Android signing key:

   ```bash
   npx eas-cli@latest build --platform android --profile release
   ```

4. Create an Expo access token, then add it to this GitHub repository as an Actions secret named `EXPO_TOKEN`.

### Release

1. Set `expo.version` in `app.json`, for example `1.0.0`.
2. Commit and push the change.
3. Create and push the matching tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

The workflow runs the checks, builds a signed APK, and attaches it to a GitHub prerelease. EAS increments Android's internal `versionCode` automatically.

Android users can download the APK from GitHub Releases. Their phone may ask them to allow installs from the browser or file manager used to open it.

## Test Dropbox sync on a Mac iOS Simulator

Expo Go will not work for this test because Dropbox must return to the app through its custom URL scheme. Use a locally compiled iOS build.

### 1. Prepare the Mac

1. Install Xcode from the Mac App Store.
2. Open Xcode once and accept its license/setup prompts.
3. In Xcode, open **Settings → Components** and install an iOS Simulator runtime if none is installed.
4. In Terminal, change to this repository.
5. Install dependencies:

   ```bash
   npm install
   ```

### 2. Create the Dropbox app

1. Open the [Dropbox App Console](https://www.dropbox.com/developers/apps).
2. Select **Create app**.
3. Choose **Scoped access**.
4. Choose **App folder** access.
5. Enter a unique app name, then create the app.
6. Open the app's **Permissions** tab.
7. Enable these scopes:

   - `account_info.read`
   - `files.content.read`
   - `files.content.write`
8. Click **Submit** at the bottom of the Permissions page.
9. Open the app's **Settings** tab.
10. Under **OAuth 2 → Redirect URIs**, add this exact URI:

    ```text
    expensemanager://oauth
    ```

11. On the same page, copy the **App key**. Do not use the App secret.

### 3. Configure the app key

1. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace its value with the copied Dropbox App key:

   ```env
   EXPO_PUBLIC_DROPBOX_APP_KEY=your-real-app-key
   ```

3. Save the file. `.env` is ignored by Git.

### 4. Build and launch the iOS app

Run:

```bash
npx expo run:ios
```

Expo will create the native iOS project, start Metro, boot an iOS Simulator, install the app, and launch it. The first build can take several minutes.

### 5. Test encrypted upload

For a fresh first-sync test, delete `Apps/<your Dropbox app name>/expenses.enc` if it exists and contains only disposable test data. An old `expenses.json` file is ignored and does not need to be deleted.

1. Open **Add** and save an expense.
2. Open **Settings**.
3. Tap **Connect Dropbox**.
4. Sign in with your Dropbox account and approve access.
5. After returning to the app, tap **Sync now**.
6. Confirm the app shows **Synced. Save recovery key below.**
7. Copy the recovery key and keep it temporarily for the restore test. Anyone with this key can decrypt the backup.
8. Open Dropbox in a browser and find:

   ```text
   Apps/<your Dropbox app name>/expenses.enc
   ```

9. Open or download the file. It should contain an encryption version and ciphertext, not readable expense data.

### 6. Test download and restore

Use a second, unused Simulator so it has neither the local database nor the recovery key. Uninstalling the app alone is insufficient because the iOS Keychain can retain SecureStore values.

1. Keep `expenses.enc` and the recovery key from the previous test.
2. Run the app on another Simulator:

   ```bash
   npx expo run:ios --device
   ```

3. Select a different Simulator when prompted.
4. Open **Settings**, then connect the same Dropbox account.
5. Tap **Sync now**. The app should request the recovery key without changing the Dropbox file.
6. Paste the saved key and tap **Save recovery key**.
7. Tap **Sync now** again.
8. Open **History**. The earlier expense should be restored.

If no unused Simulator is available, erase one through **Simulator → Device → Erase All Content and Settings**, then reinstall. This deletes all data on that Simulator.

### Troubleshooting

- **Connect Dropbox is disabled:** verify `.env` contains the real key, stop Metro, then rerun `npx expo run:ios`.
- **Dropbox rejects the redirect:** verify `expensemanager://oauth` is entered exactly in Dropbox App Console.
- **Browser does not return to the app:** verify you launched the compiled app, not Expo Go.
- **Native build is stale:** stop Metro and rerun `npx expo run:ios`.
- **Recovery key is not requested:** use a fresh Simulator; the current Simulator still has the key in its Keychain.
- **Could not decrypt Dropbox data:** restore the exact recovery key created with that `expenses.enc` file.

Sync merges data into the user's own Dropbox App Folder. Conflicts use each device's `updatedAt`, so keep device clocks automatic.

Routes live in `src/app`; shared UI, storage, repositories, and sync code live under `src`.
