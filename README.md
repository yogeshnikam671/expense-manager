# Welcome to your Expo app 👋

## Dropbox development setup

Create a Dropbox app with **App Folder** access, enable `account_info.read`, `files.content.read`, and `files.content.write`, and add OAuth redirect URI `expensemanager://oauth`. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_DROPBOX_APP_KEY` to its app key. Sync file lives at `/Apps/<app-folder>/expenses.json`; app-folder name comes from Dropbox app config. Use a development build for OAuth testing; Expo Go cannot handle this custom redirect reliably.

After connecting, Settings → Sync now merges local data with that fixed file. No folder picker or Full Dropbox access.

Conflicts use each device's `updatedAt`; keep device clocks automatic. Add logical record revisions before supporting cross-device edits or deletes.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing files inside **src/app**. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
