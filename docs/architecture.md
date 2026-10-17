# Architecture decisions

## Application shape

SmartBiz is a modular monolith for its first release. The web dashboard and Flutter client call one versioned REST API. The API owns validation, access control, reporting queries, and database writes. PostgreSQL is the source of truth. Native clients send a bearer token and the selected `X-Business-Id` on business-scoped requests.

## Identity and tenancy

- Users authenticate with email and password; passwords are stored using Argon2 hashes.
- The API issues signed HS256 access tokens with a 30 minute lifetime.
- Each token has a unique identifier. Logout stores that identifier until its expiry, so the token is rejected immediately.
- A `business_memberships` row links each user to a business and carries one of four roles: owner, admin, sales, viewer.
- Tenant-scoped API requests provide a business ID, and the API verifies membership before querying any business data.
- The owner can grant admin. Owners and admins can manage products; owners, admins, and sales members can create customers and sales. All members can read business data.
- Registration can create a user alone or create a business and owner membership in one transaction.
- Owners and admins can create seven-day invitations. Only a hash of each invitation token is stored; accepting one requires an authenticated account with the invited email.
- Membership removal immediately blocks future requests to that business, even while the user's bearer token is still valid.
- Invitation tokens are returned to the creating owner/admin for manual delivery. Email delivery and address verification are not implemented, so the flow is for local development until those controls are added.

## Initial domain boundaries

- Identity and business tenancy: users belong to businesses through memberships; every business record is tenant scoped.
- Catalog: products and stock levels.
- CRM: customers and their contact details.
- Sales: orders and immutable line-item snapshots (product name, unit price, quantity, discounts, and tax at time of sale).
- Analytics: read-only aggregates derived from completed sales; reports must use the business timezone and date range.
- Date filters are inclusive business-local dates converted to UTC instants; sales trend buckets are grouped in local calendar time.
- CSV exports include line-item snapshots, escape untrusted spreadsheet text, and reject ranges exceeding the export row cap rather than returning partial data.

## Early design constraints

- Store money as integer minor units (paise) plus an ISO currency code; avoid floating point arithmetic.
- Keep sale line prices as snapshots so later catalog edits do not rewrite sales history.
- Use UTC timestamps in storage and make reporting timezone explicit.
- Add tenant scoping to persistence and API queries before introducing real business data.
- Keep the first release as a modular monolith; extract services only if measured needs justify it.

## Local development

Docker Compose runs the API and PostgreSQL. Local secrets belong in the ignored root `.env` file; `.env.example` contains placeholders. Production secrets must come from the deployment environment. Configure a random `JWT_SECRET` of at least 32 characters before starting the API.
