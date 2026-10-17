# SmartBiz Mobile

Flutter companion for sales capture and inventory. It signs in against the existing SmartBiz API, shows the last 30 days of sales, lists product stock, and records sales while the API decrements inventory.

## Run on Android

Start the API and PostgreSQL from the repository root with Docker Compose. Rebuild it after changing the API CORS configuration:

```powershell
docker compose up --build -d api
```

Then, from `mobile/`:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`10.0.2.2` is the Android emulator address for the host computer. For a physical Android device, use the computer's reachable LAN address, for example `http://192.168.1.20:8000`. The development and profile Android manifests allow cleartext HTTP for local API development; use HTTPS for production builds.

## Run on the iOS simulator

Use `http://127.0.0.1:8000` as `API_BASE_URL` when the API is running on the same Mac as the simulator. For a physical device, use the Mac's reachable LAN address and allow SmartBiz local-network access when prompted.

```sh
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

The signed-in access token is kept in memory for the current app session and revoked through the API on sign out. Register in the app to create an owner account and business, or sign in with an existing account. This first version selects the first business membership on the account.

## Preview in Chrome

The web target is a local preview for development when no emulator or phone is connected. Start the API first, then run from `mobile/`:

```powershell
flutter run -d chrome --web-port 5000 --dart-define=API_BASE_URL=http://localhost:8000
```

The API allows the dashboard origin on port 3000 and this preview origin on port 5000 by default. Rebuild the API with `docker compose up --build -d api` after changing CORS settings. Keep the port fixed so browser CORS matches the API's local origin allowlist.
