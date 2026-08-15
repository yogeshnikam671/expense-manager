# Expense Manager

Expo app for recording expenses, reviewing category totals, and manually syncing data through Dropbox.

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

### 5. Test upload

1. Open **Add** and save an expense.
2. Open **Settings**.
3. Tap **Connect Dropbox**.
4. Sign in with your Dropbox account and approve access.
5. After returning to the app, tap **Sync now**.
6. Confirm the app shows **Synced**.
7. Open Dropbox in a browser and find:

   ```text
   Apps/<your Dropbox app name>/expenses.json
   ```

The expense should exist in that file.

### 6. Test download and restore

1. Keep the synced Dropbox file from the previous test.
2. Remove the app and its local database from the running Simulator:

   ```bash
   xcrun simctl uninstall booted com.yogeshanandanikam.expensemanager
   ```

3. Reinstall and launch it:

   ```bash
   npx expo run:ios
   ```

4. Open **Settings**, connect the same Dropbox account, then tap **Sync now**.
5. Open **History**. The earlier expense should be restored.

### Troubleshooting

- **Connect Dropbox is disabled:** verify `.env` contains the real key, stop Metro, then rerun `npx expo run:ios`.
- **Dropbox rejects the redirect:** verify `expensemanager://oauth` is entered exactly in Dropbox App Console.
- **Browser does not return to the app:** verify you launched the compiled app, not Expo Go.
- **Native build is stale:** stop Metro and rerun `npx expo run:ios`.

Sync merges data into the user's own Dropbox App Folder. Conflicts use each device's `updatedAt`, so keep device clocks automatic.

Routes live in `src/app`; shared UI, storage, repositories, and sync code live under `src`.
