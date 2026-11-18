# SmartBiz Presentation Instructions

Use this brief to create a clear project presentation for instructors, classmates, and small-business stakeholders. The presentation should explain the business problem, what SmartBiz does, how it was built, and how the implementation maps to the 18 syllabus checkpoints documented in `docs/architecture.md`.

## Presentation goals

By the end, the audience should understand:

1. Why small businesses need a shared way to manage customers, products, inventory, and sales.
2. What SmartBiz currently implements and how a user moves through its main workflows.
3. Which syllabus skills the project demonstrates, with concrete evidence from the app and repository.
4. What is only partial or still planned, so the presentation does not overstate the result.
5. How the architecture, local setup, and deployment fit together.

## Audience, length, and style

- Aim for 12–15 main slides and a short appendix for the syllabus mapping.
- Use plain language first; introduce technical terms only when explaining how a feature works.
- Use the actual SmartBiz interface for screenshots. Prefer screenshots from the running app with synthetic data.
- Use a clean business-software style: light backgrounds, green/emerald accents consistent with the app, readable type, concise labels, and generous spacing. Keep dark-theme screenshots as examples of the theme option rather than changing the whole deck to dark.
- Use simple diagrams for architecture and workflows. Avoid decorative diagrams that do not explain a real part of the project.
- Put details and caveats in speaker notes when they would clutter a slide.
- Do not show secrets, `.env` contents, passwords, access tokens, private customer data, or production database records.

## Recommended slide sequence

### 1. Title

**SmartBiz: Sales, Inventory, and Business Insights for Small Businesses**

Include the presenter, course, and date. Use a screenshot or a simple illustration of a shop owner reviewing sales and stock.

### 2. The problem

Explain the practical problems the project addresses:

- Customer, product, and sales information can be scattered across spreadsheets or paper.
- Manual entry and duplicate data make records difficult to maintain.
- Owners may not see sales trends or product performance quickly.
- Recording a sale and keeping inventory current can become separate, error-prone tasks.

Frame these as the project motivation, not as measured research findings unless sources are added.

### 3. Why this project is useful

Describe the intended value:

- Keep customer, product, and sales records in one business workspace.
- Record sales against products and update stock as part of the sale workflow.
- Import existing CSV records to reduce re-entry effort.
- Filter sales and view revenue and product performance for a selected period.
- Give a small business a practical foundation that can grow into deeper inventory and profitability tools.

Avoid claiming that SmartBiz guarantees higher revenue, prevents all stock errors, or replaces accounting software.

### 4. Project overview and user journey

Show the main flow: create/sign in to an account → select or create a business workspace → add/import products and customers → record or import sales → review filtered sales and dashboard insights.

Mention that business records are scoped to a workspace and roles control access.

### 5. Feature tour

Group the current functionality by user need:

- **Workspace and access:** accounts, email verification flow, memberships, roles, invitations, profile and account settings.
- **Records:** customer and product create/edit/delete or maintenance flows; inventory stock and product status.
- **Sales:** record live sales, import historical sales from CSV, view/edit sales, and print a sales receipt.
- **Insights:** filter sales by customer, product, and date; view dashboard totals, trends, and top products; export filtered sales data to CSV.
- **Usability:** responsive web interface, light/dark theme, customer purchase-history drawer, command palette, and SKU/barcode keyboard input.

Use screenshots with short callouts rather than a wall of text.

### 6. Data import and validation

Show the CSV import preview. Explain that product, customer, and sales records can be imported from CSV, with field mapping/validation and row-level feedback. Sales CSV columns can be mapped to the expected fields so variations in headers can be handled.

Clearly state that Excel `.xlsx` import is not implemented. Do not call the import feature “CSV and Excel.”

### 7. Sales, stock, and profitability

Explain the difference between a live sale and a historical import:

- A live sale validates business-owned products and customer, saves sale line items, snapshots product details, and updates available stock transactionally.
- Historical sales imports preserve historical sales records and do not retroactively reduce current stock.
- Product cost and sale-line cost snapshots support cost of goods sold and gross profit reporting when cost data is available.
- If historical sale lines have unknown costs, profit metrics should be shown as incomplete/unknown rather than treated as zero cost.

Do not present profit estimates as complete when cost prices are missing.

### 8. Analytics and reports

Show dashboard totals, the sales trend, top products, and customer/product/date filters. Explain that the dashboard uses API-backed data and the selected period and filters affect the displayed results.

State that SmartBiz has in-app analytics and CSV reporting. A dedicated Power BI/Tableau report and published BI dataset are not currently part of the project.

### 9. Architecture

Use a compact diagram with these components and connections:

```text
Next.js web app ─┐
                 ├─ HTTPS/JSON API → FastAPI → PostgreSQL
Flutter app ─────┘                     └→ optional SMTP email delivery
```

Label the stack accurately: Next.js/React/TypeScript, Flutter/Dart, FastAPI/Python, SQLAlchemy/Alembic, and PostgreSQL. The API is a modular monolith; web, API, and database run as separate services.

### 10. Database and security

Show a simplified relationship diagram: users ↔ business memberships ↔ businesses; businesses own products, customers, and sales; sales contain sale items; sale items keep product name/price/cost snapshots for historical reporting.

Mention password hashing, signed access tokens with refresh-token rotation, workspace authorization, database constraints, and schema migrations. Keep this high-level; never put token examples or secret values on the slide.

### 11. Web and mobile experience

Show separate web and Flutter screenshots. The web app contains the broadest set of workflows. Describe Flutter as a companion app with a smaller implemented slice such as sign-in, summary, product/sales views, and sale entry; do not imply every web screen exists in Flutter.

### 12. Development and deployment

Show the local Docker Compose services (web, API, PostgreSQL) and the configured Render services (web, API, managed PostgreSQL). Mention Git branches and pull requests as the change workflow.

Describe deployment status carefully: the project is configured for Render, and code changes have been merged to `main`; only say the latest changes are live after checking Render's deployment status and opening the deployed site.

### 13. Demo or walkthrough

Use a dedicated synthetic workspace and demonstrate:

1. Open Overview and set a date range.
2. Open Products and Customers; show record maintenance or CSV preview.
3. Record a sale and show the product stock change.
4. Filter sales by customer, product, and date and show the dashboard response.
5. Open customer purchase history and print a receipt.
6. Show cost/profit metrics only if the demo products have cost prices.

The command palette, theme toggle, and SKU scanner input can be shown as short usability highlights.

### 14. Limitations and next steps

Use a balanced roadmap slide. Potential next steps include:

- Add Excel import if users need `.xlsx` files.
- Add a camera-based barcode scanner; current barcode/SKU entry supports keyboard-wedge scanners and typed SKU input, not camera scanning.
- Add tests and continuous-integration checks for API, migrations, imports, authorization, and UI workflows.
- Complete a dedicated Power BI/Tableau artifact if required by the course.
- Add production monitoring, backup/restore drills, and operational policies before relying on the system for important business records.
- Extend Flutter to more of the web app's management workflows.

### 15. Conclusion

Reinforce the project’s core outcome: SmartBiz connects record management, stock-aware sales, and practical business insights in one small-business workflow. End with a short demonstration invitation or Q&A.

## Syllabus mapping for an appendix or one/two summary slides

Use this matrix as the source of truth for syllabus coverage. The checkpoint names are the project’s 18-item syllabus grouping documented in `docs/architecture.md`; they may not match the wording of an official course handout. If the official syllabus uses different language, preserve its exact wording in the deck and map it to the evidence below without inventing coverage.

| # | Syllabus checkpoint | SmartBiz evidence | Status to present |
|---:|---|---|---|
| 1 | Obtain and import CSV/Excel data | Customer, product, and historical sales CSV import | CSV implemented; Excel/XLSX not implemented |
| 2 | Clean and validate imported data | Preview, field parsing, duplicate/reference checks, row-level errors, dynamic sales-header mapping | Implemented for supported CSV formats |
| 3 | Map fields and establish data relationships | Business-scoped customer/product IDs, sales and sale-item relationships | Implemented |
| 4 | Calculate measures and visualize/publish analytics | Dashboard KPIs, trends, top products, filters, CSV report | App analytics implemented; BI publishing not implemented |
| 5 | Build responsive layouts with grid/flex | Responsive Next.js layouts and navigation | Implemented with custom CSS |
| 6 | Build input forms and data-entry flows | Account, product, customer, sale, and CSV workflows | Implemented |
| 7 | Add validation, dialogs, and user feedback | Pydantic validation, import previews, dialogs, loading/error/success states | Implemented for current workflows |
| 8 | Use responsive UI components and build Flutter companion | Responsive web UI and Flutter sign-in, summary, product/sales views, sale entry | Partially implemented in Flutter |
| 9 | Design normalized relational tables and keys | Users, businesses, memberships, customers, products, sales, sale items, identity/security records | Implemented with PostgreSQL constraints and migrations |
| 10 | Demonstrate SQL joins, aggregates, nested queries/views | SQLAlchemy joins and aggregate/subquery analytics | Joins/aggregates implemented; explicit SQL-view artifact not documented |
| 11 | Create an HTTP backend server | FastAPI API with health/readiness endpoints | Implemented |
| 12 | Implement REST endpoints and CRUD | Auth, memberships, customers, products, sales, imports, analytics, exports | Implemented for supported resources |
| 13 | Connect API to PostgreSQL | SQLAlchemy, psycopg, transactional sales/stock updates, Alembic | Implemented |
| 14 | Initialize and maintain Git repository | Private GitHub repository with branches and commits | Implemented |
| 15 | Use branches and collaborate through changes | Feature branch and merged pull request to `main` | Demonstrated; broader team review process depends on collaborators |
| 16 | Resolve conflicts, structure repository, use `.gitignore`/versions | Organized monorepo, ignore rules, lockfiles, migration history, pull-request merge | Structure/versioning implemented; conflict-resolution exercise and release tags not documented |
| 17 | Containerize app and configure environment | Dockerfiles, Compose, `.env.example`, secret exclusion, persistent DB volume | Implemented and locally run |
| 18 | Deploy with a database and automate deployment | Render web/API/PostgreSQL configuration, readiness checks, GitHub-connected deployment | Deployment configured; CI checks and production restore runbook remain |

## Accuracy guardrails

- Call the printable document a **sales receipt**, not a tax invoice. GST/tax calculations are not configured.
- Do not imply that SMTP is configured unless delivery has been verified. Local development can use manual verification links.
- Do not say SmartBiz imports Excel; imports are CSV only.
- Do not say the barcode feature uses a camera. It accepts typed SKUs and keyboard-wedge scanner input.
- Do not describe the in-app dashboard as a Power BI report.
- Label demo dashboard figures and sample CSV data as synthetic.
- Do not claim all 18 checkpoints are fully complete. Preserve the partial and not-implemented labels in the syllabus matrix.
- Verify the live Render deployment before stating that a given commit is publicly available.

## Suggested presentation-generation prompt

Create a 12–15 slide project presentation using this file and `docs/architecture.md` as the source of truth. Explain the business problem and usefulness of SmartBiz, demonstrate the implemented product features and architecture, and map the project honestly to all 18 syllabus checkpoints. Use screenshots or simple diagrams where they clarify the product. Distinguish implemented, partial, and planned work. Follow the accuracy guardrails in this file. Do not invent outcomes, user counts, financial impact, integrations, or syllabus coverage. Use synthetic data only and never show credentials or private records. Put detailed syllabus evidence in an appendix if it will make the main story too dense.
