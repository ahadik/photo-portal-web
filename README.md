# Photo Portal Web

Web application for the Photo Portal project, providing both the device slideshow interface and the admin portal for managing photos and messages.

## Overview

This is a unified React application that serves two interfaces:
- **Device App** (`/device/*`): Full-screen slideshow interface for displaying photos on the wall-mounted device
- **Admin Portal** (`/admin/*`): Web interface for uploading photos, sending messages, and managing content

The app is built with React, TypeScript, Vite, and Firebase, and is deployed to Firebase Hosting.

## Setup

Setup is split into three phases. Skip phases you've already completed — for example, if you've already configured the Firebase project from another computer, skip phase 2 on the new machine and only run phases 1 and 3.

### Phase 1 — One-time machine setup

Do this once per computer.

1. **Install Node.js 24 via [nvm](https://github.com/nvm-sh/nvm).** The repo includes an `.nvmrc` pinning the version, so `nvm use` / `nvm install` will pick it up automatically inside the project directory.
2. **Install the Firebase CLI globally via npm — not via Homebrew or the standalone installer.**
   ```bash
   npm install -g firebase-tools
   ```
   The standalone installer drops an Intel binary at `/usr/local/bin/firebase` that fails with `Bad CPU type in executable` on Apple Silicon. The npm install puts `firebase` under your active nvm-managed Node and avoids that mismatch — but it also means you need the right Node active in every shell that calls `firebase` (see "Running the app locally" below).
3. **Install a Java runtime.** The Firebase Storage emulator requires Java. On macOS, the easiest path is:
   ```bash
   brew install --cask temurin
   ```
   Verify with `java -version`. Without this, `npm run serve` in `functions/` will fail with `Unable to locate a Java Runtime`.
4. **Log in to Firebase:**
   ```bash
   firebase login
   ```
5. **Have these accounts/keys ready** (you'll paste them into `.env` in phase 3):
   - **Mapbox** account with a public access token — used client-side for the map view.
   - **Google Cloud** project with the **Geocoding API** enabled and an API key — used server-side in Cloud Functions for reverse geocoding, and client-side for some lookups.

### Phase 2 — One-time project setup

Do this once per Firebase project. Skip on a second computer if the project is already configured.

1. **Select the Firebase project for this checkout:**
   ```bash
   firebase use --add
   ```
2. **Update Storage security rules with your account emails.** Edit [`storage.rules`](storage.rules) lines 7 and 12 to the Firebase Auth emails for the device and admin accounts, then deploy:
   ```bash
   firebase deploy --only storage
   ```
3. **Set the Functions secret for reverse geocoding:**
   ```bash
   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
   ```
   (Paste your Google Maps API key when prompted.)
4. **Confirm both Storage buckets exist** in the Firebase console: `photo-portal-media` and `photo-portal-data`.

### Phase 3 — Per-clone setup

Do this every time you clone the repo on a new machine.

1. **Select the right Node version:**
   ```bash
   nvm use
   ```
2. **Install dependencies (root + functions):**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```
3. **Create your `.env` file** by copying the sample and filling in values:
   ```bash
   cp .env.sample .env
   ```
   The `VITE_FIREBASE_*` values come from the Firebase console (Project Settings → Your apps → Web app SDK config). The Mapbox public token and Google Maps API key come from the accounts you set up in phase 1.

## Running the app locally

Local development runs against the Firebase Emulator Suite. The dev build at [src/services/firebase.ts](src/services/firebase.ts) auto-connects Storage to `localhost:9199` and Functions to `localhost:5001`, so the emulators **must** be running — `npm run dev` alone will not work.

You'll typically have two terminals open. **Run `nvm use` in each terminal before any `firebase` or `npm` command** — including inside `functions/`. The `firebase` binary lives under your active nvm Node, so a shell on a different Node version won't find it (or will find a stale one).

**Terminal A — emulators:**
```bash
cd functions
nvm use
npm run serve
```
This builds the functions and starts the Emulator Suite (Functions on `5001`, Storage on `9199`, Emulator UI on `4000`).

**First run only**, seed empty `photos.json` and `messages.json` so the app has data to read:
```bash
cd functions
nvm use
npm run seed-emulator
```

To wipe local emulator data and start over later:
```bash
cd functions
nvm use
npm run reset
```

**Terminal B — Vite dev server:**
```bash
nvm use
npm run dev
```

The app is served on port `3000`:
- Device app: <http://localhost:3000/device>
- Admin portal: <http://localhost:3000/admin>

## Linting

```bash
npm run lint
```

## Building

```bash
npm run build
```

This type-checks the TypeScript, builds the React app with Vite, and outputs the production bundle to `public/`.

Preview the production build locally:
```bash
npm run preview
```

## Deployment

The active deploy path is Firebase Hosting + Functions + Storage rules, configured in [`firebase.json`](firebase.json). The build runs automatically as a hosting predeploy step, so you don't need a manual `npm run build`.

**Deploy everything:**
```bash
firebase deploy
```

**Deploy specific services:**
```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only storage
```

## Project Structure

```
photo-portal-web/
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts          # Function definitions (processUpload, sendMessage)
│   │   ├── common.ts         # Shared utilities and types
│   │   ├── seed-emulator.ts  # Emulator seed script
│   │   └── wipe-storage.ts   # Emulator reset script
│   └── package.json
├── src/                    # React application source
│   ├── components/        # React components
│   │   └── admin/         # Admin portal components
│   ├── routes/            # Route components (DeviceApp, AdminApp)
│   ├── services/          # Data services (api, cache, firebase)
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Application entry point
│   ├── config.ts         # Configuration constants
│   └── types.ts          # TypeScript type definitions
├── public/                # Build output (generated by `npm run build`)
├── configs/              # Configuration files
│   └── cors.json         # CORS config (for reference, not used with Firebase Storage)
├── sample_data/          # Sample JSON files for testing
├── firebase.json         # Firebase Hosting + Functions + Storage configuration
├── apphosting.yaml       # Firebase App Hosting configuration (see section below)
├── storage.rules         # Firebase Storage security rules
├── vite.config.ts        # Vite build configuration
└── package.json          # Node.js dependencies and scripts
```

## Firebase Configuration

### Required Firebase Services

- **Authentication**: Email/password provider enabled
- **Hosting**: Configured to serve the React app
- **Functions**: Cloud Functions for image processing and message handling
- **Storage**: Firebase Storage buckets for photos and data

### Firebase Storage Buckets

- `photo-portal-media`: Uploaded photos, processed images, and thumbnails
- `photo-portal-data`: JSON metadata files (`photos.json`, `messages.json`)

### Authentication Accounts

- **Device Account**: Read-only access to Firebase Storage (for the device app)
- **Admin Account**: Read and write access to Firebase Storage (for the admin portal)

The exact email addresses for these accounts are hard-coded in [`storage.rules`](storage.rules) and must match real Firebase Auth users.

## Environment Variables

The complete list lives in [`.env.sample`](.env.sample). There are two groups:

- **`VITE_*` variables** are read by the client at build time via `import.meta.env.VITE_*`. They include the Firebase web SDK config, bucket names, the Mapbox public token, and the Google Maps API key.
- **Unprefixed variables** (`MAPBOX_TOKEN`, `MEDIA_BUCKET`, `DATA_BUCKET`) are read by Firebase Functions via `process.env.*`. These are only relevant when running the Functions emulator locally; in production, the equivalent values come from Functions secrets configured via `firebase functions:secrets:set`.

## About `apphosting.yaml`

[`apphosting.yaml`](apphosting.yaml) configures Firebase **App Hosting**, which is a different Firebase product from Firebase Hosting. App Hosting runs the app on a managed Cloud Run backend and is intended for SSR or backend-bound workloads. This project is currently deployed as a static site via Firebase Hosting (the path described in the Deployment section above), so `apphosting.yaml` is **not** on the active deploy path. The file is kept so the project can be switched to App Hosting later without redoing the configuration.

When App Hosting is in use, `apphosting.yaml` controls two things:

- **`runConfig`** — Cloud Run sizing parameters (min/max instances, CPU, memory, concurrency).
- **`env`** — environment variables and secrets that get injected at build and/or runtime. Each entry specifies:
  - `variable`: the environment variable name the code reads (e.g. `import.meta.env.VITE_MEDIA_BUCKET`).
  - Either `value` for a plain literal, or `secret` referencing a name in Google Cloud Secret Manager for sensitive values.
  - `availability`: which phases the variable is exposed in. `BUILD` makes it visible to Vite at build time (required for any `VITE_*` value that needs to be baked into the bundle), `RUNTIME` makes it visible to the running server, and both can be listed together.

The file as it stands declares two plain build-time variables, `VITE_MEDIA_BUCKET` and `VITE_DATA_BUCKET`, and no secrets. A comment in the file notes that the Mapbox token is intentionally not exposed here because it's only consumed server-side in Cloud Functions, not in the client build.

## Troubleshooting

### Node version issues

If you see Node version warnings, ensure you're on Node 24:
```bash
nvm use
node --version  # Should show v24.x.x
```

### Dev server can't reach Firebase

The dev build connects directly to the emulators. If `npm run dev` shows connection errors against `localhost:9199` or `localhost:5001`, make sure `cd functions && npm run serve` is running in another terminal.

### App loads but `photos.json` / `messages.json` are missing

The emulator hasn't been seeded. Run `cd functions && npm run seed-emulator`.

### Firebase Functions build errors

```bash
cd functions
npm install
npm run build
```

### Environment variables not working

- Ensure `.env` is in the repo root (not in `src/`).
- Restart the dev server after changing `.env`.
- Frontend variables must be prefixed `VITE_` and accessed via `import.meta.env.VITE_*`.

### Firebase Storage access denied

- Verify Storage rules are deployed: `firebase deploy --only storage`.
- Check that the user is authenticated with the correct Firebase Auth account.
- Verify the email addresses in [`storage.rules`](storage.rules) match your Firebase Auth accounts.

## Documentation

- **[Product Requirements](./docs/product_requirements.md)** — product spec, architecture, feature requirements
- **[Developer Resources](./docs/developer_resources.md)** — grid system, styling, component patterns
- **[Functions README](./functions/README.md)** — detail on the individual Cloud Functions

## License

[Add your license here]
