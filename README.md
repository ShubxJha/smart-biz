# SmartBiz

SmartBiz is a sales management and business analytics platform for small businesses. The API supports accounts, business memberships, customer and product records, stock-aware sales capture, and business-local analytics. The Next.js dashboard connects these workflows in a browser; the Flutter companion app is planned.

## Run locally

Install Docker Desktop, then from the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env: replace the placeholders with a random database password and a random JWT_SECRET of at least 32 characters.
docker compose up --build
```

The dashboard is available at `http://localhost:3000`. The API is available at `http://localhost:8000`; interactive API docs are at `http://localhost:8000/docs`. Alembic applies database migrations when the API starts. `GET /health` reports API liveness.

## Register and call the API

Registration creates an account, a business, and an owner membership, then sends a one-time email verification link that expires after 24 hours. Set up SMTP to deliver verification links. Without SMTP, the API returns a manual verification URL for local development. Login and invitation acceptance require a verified email. Existing accounts must sign in once after the verification migration to receive a verification link. Passwords are hashed with Argon2; login returns a signed bearer access token that expires after 30 minutes. Registration and login have shared PostgreSQL-backed per-minute limits by client address and normalized email, so limits apply across API replicas.

You can also create an account from the dashboard at `http://localhost:3000`. Sign in to view sales metrics, revenue trends, top products, recent orders, and download a CSV report. The dashboard stores its access token only for the current browser tab session. To run the web app outside Docker, use Node.js 22 or newer from `web/` with `npm install` followed by `npm run dev`; configure `NEXT_PUBLIC_API_URL` when the API is hosted somewhere other than `http://localhost:8000`. Set `WEB_ORIGINS` on the API to the dashboard's exact origin when using a different local address.

```powershell
$auth = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/auth/register -ContentType 'application/json' -Body '{"email":"owner@example.com","full_name":"Sample Owner","password":"<YOUR_UNIQUE_PASSWORD>","business_name":"Sample Shop"}'
$businessId = $auth.memberships[0].business.id
$headers = @{ Authorization = "Bearer $($auth.access_token)"; 'X-Business-Id' = "$businessId" }
```

Create a product, record a sale, then read the summary:

```powershell
$product = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/products -Headers $headers -ContentType 'application/json' -Body '{"name":"Notebook","sku":"NOTE-001","price_minor":5000,"stock_quantity":20}'
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/sales -Headers $headers -ContentType 'application/json' -Body (@{ items = @(@{ product_id = $product.id; quantity = 2 }) } | ConvertTo-Json -Depth 5)
Invoke-RestMethod -Method Get -Uri http://localhost:8000/api/v1/dashboard/summary -Headers $headers
```

Money values use integer minor units. For INR, `5000` represents ₹50.00. Sales snapshot product name and price, decrement stock transactionally, and reject cross-business product/customer references.

## Analytics and reports

`GET /api/v1/dashboard/summary` and `GET /api/v1/sales` default to the previous 30 calendar days in the business timezone. Supply inclusive `from_date` and `to_date` values (`YYYY-MM-DD`) to choose a range; ranges are limited to 366 days. Sales lists also accept `customer_id`, `limit`, and `offset`.

- `GET /api/v1/analytics/sales-trend?interval=day` supports `day`, `week`, or `month` buckets and fills empty buckets with zeroes.
- `GET /api/v1/analytics/top-products` returns units sold and revenue by product name.
- `GET /api/v1/reports/sales.csv` downloads line-item sales details in the business timezone; exports over 50,000 sales are rejected so they are not silently truncated.

All date filters are interpreted as business-local calendar dates and converted to UTC for querying. CSV text cells are escaped against spreadsheet formula injection.

## Identity and roles

All business data routes require both `Authorization: Bearer <token>` and `X-Business-Id`. The API verifies that the signed-in user belongs to the selected business. Roles are `owner`, `admin`, `sales`, and `viewer`. Owners and admins can manage products; owners, admins, and sales members can create customers and record sales. Viewers can read business data. Only owners can grant the admin role.

Owners and admins can invite a new or existing account with `POST /api/v1/businesses/invitations`, sending `{"email":"staff@example.com","role":"sales"}`. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_TLS_MODE`, and `APP_BASE_URL` in `.env` to deliver a seven-day invitation link. Set `APP_BASE_URL` to the public HTTPS dashboard URL for deployment. `SMTP_TLS_MODE` supports `starttls` (default), `ssl`, or `none` for a trusted local relay. When SMTP is unset, the response includes a one-time token and invitation URL for manual delivery; if sending fails, it reports `delivery_status: "failed"` and includes the token as a fallback. Successful email delivery returns `delivery_status: "sent"` without exposing the token to the inviter. Recipients open the link and sign in or create an account using the invited email; the dashboard accepts the invitation. Invitations store only a token hash and can be revoked. Invitation email does not verify ownership of the recipient address; add account email verification before relying on it as an identity check.

Owners and admins can list pending invitations with `GET /api/v1/businesses/invitations` and revoke one with `DELETE /api/v1/businesses/invitations/{invitation_id}`. `DELETE /api/v1/businesses/members/{user_id}` removes a non-owner member from the selected business; owners cannot be removed through this endpoint. Membership removal blocks that user's future access to the business. `POST /api/v1/auth/logout` revokes the current access token immediately. Tokens expire after 30 minutes in any case.

Authentication endpoints are `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.

The ignored `.env` file holds local secrets; `.env.example` contains placeholders only. Use a random JWT secret of at least 32 characters in deployment. Access tokens expire after 30 minutes; logout revokes the current token, while refresh-token rotation is not implemented yet.

## Deployment

Docker Compose is the reference deployment. Before public launch, set `DB_PASSWORD` and `JWT_SECRET` to generated secrets, set `APP_BASE_URL` and `NEXT_PUBLIC_API_URL` to the public HTTPS dashboard and API URLs, and set `WEB_ORIGINS` to the exact dashboard origin (scheme, host, and port). Configure authenticated SMTP with TLS and a verified sender address; public account verification and invitation delivery depend on it. Keep `.env` out of source control and use the deployment platform's secret store.

Place a TLS reverse proxy in front of the web and API services. The PostgreSQL port is not published to the host; preserve that setting in deployment. Configure the proxy to forward requests to the web and API, restrict access to API documentation if needed, and replace `X-Forwarded-For` rather than appending untrusted client input. Only then set `RATE_LIMIT_TRUST_PROXY=true`; otherwise the API applies rate limits to its direct peer address. The built dashboard embeds `NEXT_PUBLIC_API_URL`, so rebuild the web image when that URL changes.

The API exposes `/health` for liveness and `/ready` for readiness (including a database query). Back up the PostgreSQL volume before upgrades and test restoring a backup. Alembic migrations run at API startup; take care when deploying multiple API replicas at once so only one release process applies migrations at a time. The rate limiter uses PostgreSQL fixed-minute buckets and prunes expired buckets on auth requests.

## Stack and layout

- API: Python 3.12, FastAPI, SQLAlchemy, Alembic, PyJWT, pwdlib/Argon2
- Database: PostgreSQL 16
- Web: Next.js and TypeScript
- Mobile: Flutter and Dart
- `backend/`: API and database migrations
- `web/`: browser dashboard
- `mobile/`: Android and iOS sales and inventory app
- `docs/`: architecture decisions

## Next milestones

1. Select a hosting provider, configure domain/TLS and production secrets, and exercise the production deployment and database restore procedure.
