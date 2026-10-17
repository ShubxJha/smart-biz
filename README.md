# SmartBiz

SmartBiz is a sales management and business analytics platform for small businesses. The API now supports accounts, business memberships, customer and product records, stock-aware sales capture, and a dashboard summary. A Next.js dashboard and Flutter companion app are planned client applications.

## Run locally

Install Docker Desktop, then from the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env: replace the placeholders with a random database password and a random JWT_SECRET of at least 32 characters.
docker compose up --build
```

The API is available at `http://localhost:8000`; interactive API docs are at `http://localhost:8000/docs`. Alembic applies database migrations when the API starts. `GET /health` reports API liveness.

## Register and call the API

Registration creates an account, a business, and an owner membership. Passwords are hashed with Argon2; login returns a signed bearer access token that expires after 30 minutes.

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

## Identity and roles

All business data routes require both `Authorization: Bearer <token>` and `X-Business-Id`. The API verifies that the signed-in user belongs to the selected business. Roles are `owner`, `admin`, `sales`, and `viewer`. Owners and admins can manage products; owners, admins, and sales members can create customers and record sales. Viewers can read business data. Only owners can grant the admin role.

To add an existing SmartBiz user to the selected business, an owner or admin can call `POST /api/v1/businesses/members` with `{"email":"staff@example.com","role":"sales"}`. The user must register first. Authentication endpoints are `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, and `GET /api/v1/auth/me`.

The ignored `.env` file holds local secrets; `.env.example` contains placeholders only. Use a random JWT secret of at least 32 characters in deployment, enable HTTPS, and add token revocation/rate limiting before a public launch. Access tokens currently expire after 30 minutes; refresh and logout flows are not implemented yet.

## Stack and layout

- API: Python 3.12, FastAPI, SQLAlchemy, Alembic, PyJWT, pwdlib/Argon2
- Database: PostgreSQL 16
- Web: Next.js and TypeScript (planned)
- Mobile: Flutter and Dart (planned)
- `backend/`: API and database migrations
- `docs/`: architecture decisions

## Next milestones

1. Add invitation/acceptance flow and session revocation, then cover identity and role boundaries with automated checks.
2. Add date-range analytics, sales filters, and reporting exports.
3. Build the web dashboard and connect it to the API.
4. Build Flutter sales capture and inventory views against the same API.
5. Add deployment configuration and automated test coverage.
