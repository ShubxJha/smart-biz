# SmartBiz Mobile

Flutter Android app for the SmartBiz business workflows, with phone-first navigation and the web app's matching light/dark visual theme.

## Available workflows

- Sign up, sign in, verify email, accept invitations, and switch or create businesses.
- Dashboard metrics, date ranges, revenue trends, top products, and customer/product filters.
- Sales ledger search, details, correction, deletion, CSV import/export, and printable receipts.
- Product catalog search, stock/status filters, add/edit/remove, activate/deactivate, and CSV import.
- Customer search, add/edit/remove, purchase history and lifetime metrics, and CSV import.
- Checkout with quantities, optional customer assignment, barcode/SKU input (including Bluetooth scanners), and stock updates.
- Account profile, email and password changes; team invitations, member removal, and invitation revocation.

CSV imports use Android's file chooser, then the API validates the complete import before saving. CSV export uses Android's save dialog. In browser preview, CSV can be pasted and copied instead.

## Build an Android APK

Start the API and PostgreSQL from the repository root:

```powershell
docker compose up --build -d api
```

For the Android emulator, run from `mobile/`:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

Build an installable debug APK:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

The output is `build/app/outputs/flutter-apk/app-debug.apk`. On a physical device, replace `10.0.2.2` with the computer's reachable LAN address. For production, pass the deployed HTTPS API URL and configure a release signing key. The Gradle release configuration currently uses debug signing and is not ready for Play Store upload.

The access token stays in memory for the current app session and is revoked through the API on sign out. New accounts must verify their email before signing in. Accounts with no business membership can accept an invitation inside the app after signing in.

## Preview in Chrome

Start the API, then run from `mobile/`:

```powershell
flutter run -d chrome --web-port 5000 --dart-define=API_BASE_URL=http://localhost:8000
```

The API allows the dashboard origin on port 3000 and this preview origin on port 5000 by default.
