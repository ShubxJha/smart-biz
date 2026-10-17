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

Registration creates an account, a business, and an owner membership. Passwords are hashed with Argon2; login returns a signed bearer access token that expires after 30 minutes.

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

Owners and admins can invite a new or existing account with `POST /api/v1/businesses/invitations`, sending `{"email":"staff@example.com","role":"sales"}`. The response includes a one-time token; the user must register or log in using the invited email, then call `POST /api/v1/auth/invitations/accept` with `{"token":"<invitation-token>"}`. Registration can omit `business_name` when creating an account to accept an invitation. Invitations expire after seven days and store only a hash of the token. There is no email delivery or address verification yet, so this flow is for local development; add verified email delivery before using it for real accounts.

Owners and admins can list pending invitations with `GET /api/v1/businesses/invitations` and revoke one with `DELETE /api/v1/businesses/invitations/{invitation_id}`. `DELETE /api/v1/businesses/members/{user_id}` removes a non-owner member from the selected business; owners cannot be removed through this endpoint. Membership removal blocks that user's future access to the business. `POST /api/v1/auth/logout` revokes the current access token immediately. Tokens expire after 30 minutes in any case.

Authentication endpoints are `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.

The ignored `.env` file holds local secrets; `.env.example` contains placeholders only. Use a random JWT secret of at least 32 characters in deployment, enable HTTPS, and add rate limiting before a public launch. Access tokens expire after 30 minutes; logout revokes the current token, while refresh-token rotation is not implemented yet.

## Stack and layout

- API: Python 3.12, FastAPI, SQLAlchemy, Alembic, PyJWT, pwdlib/Argon2
- Database: PostgreSQL 16
- Web: Next.js and TypeScript
- Mobile: Flutter and Dart (planned)
- `backend/`: API and database migrations
- `web/`: browser dashboard
- `docs/`: architecture decisions

## Next milestones

1. Build Flutter sales capture and inventory views against the same API.
2. Add email delivery for business invitations and complete deployment configuration.
