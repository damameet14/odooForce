# AGENTS.md

This file defines the working rules for coding agents and collaborators contributing to VendorBridge. Follow it for every change unless a task explicitly provides stricter instructions.

## Project Purpose

VendorBridge is a role-based procurement and vendor management ERP. Its core workflow is:

`RFQ creation -> vendor invitation -> quotation submission -> quotation comparison -> finance approval -> purchase order -> delivery tracking -> invoice`

The system must preserve a reliable audit trail and strict data isolation between vendors.

## Repository Layout

```text
/
  backend/                 Express API and Prisma data layer
    prisma/
      schema.prisma        Authoritative database model
      migrations/          Committed migration history
      seed.js              Development/demo seed data
    src/
      config/              Database, environment, and Swagger configuration
      controllers/         HTTP request handling and workflow orchestration
      middlewares/         Authentication, authorization, validation, errors
      routes/              API routes and Swagger annotations
      services/            Reusable audit, email, notification, PDF, numbering logic
      utils/               Small shared backend utilities
  frontend/                React/Vite web application
    src/
      api/                 Axios client and API configuration
      store/               Authentication state
      App.jsx              Routes and current UI feature components
      styles.css           Shared application styling
  .github/workflows/ci.yml Continuous integration checks
  README.md                Setup and usage overview
  CONTRIBUTING.md          Collaborator workflow
  SECURITY.md              Security and deployment requirements
```

## Required Tooling

- Node.js 22
- npm
- PostgreSQL 14 or newer
- Prisma 6.8.x

Use npm and the committed lockfiles. Do not introduce another package manager.

## Initial Setup

From the repository root:

```powershell
npm install
npm run install:all
Copy-Item backend/.env.example backend/.env
```

Configure `backend/.env` with the privately shared hackathon PostgreSQL connection URL and team JWT secret. These values must remain local and uncommitted.

Apply committed migrations:

```powershell
npm run prisma:deploy --prefix backend
```

Seed the shared development database only after confirming with the team that seeding is required:

```powershell
npm run seed --prefix backend
```

Start the frontend and backend:

```powershell
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api-docs`
- Health check: `http://localhost:5000/health`

## Architecture Rules

### Backend Boundaries

- Routes define URL structure, validation middleware, authentication, authorization, and Swagger documentation.
- Controllers handle request-specific orchestration.
- Services contain reusable cross-feature behavior such as activity logs, notifications, email, PDFs, scoring, and number generation.
- Prisma is the only database access layer. Do not add raw SQL unless Prisma cannot express the requirement and the query is parameterized.
- Use `ApiError` for expected API failures.
- Wrap asynchronous route handlers with `asyncHandler`.
- Keep unhandled server errors generic in HTTP responses. Internal stack traces and Prisma errors must remain server-side only.

### Frontend Boundaries

- Use the shared Axios client in `frontend/src/api/client.js`; do not create feature-specific Axios instances.
- Use `useAuth` for authentication state.
- Use `useLoad` for object responses and `useList` for array responses. List pages must remain safe while data is still loading.
- Use the existing `Button`, `Status`, `Table`, `PageTitle`, `ErrorBox`, and `Empty` patterns before adding new UI primitives.
- Preserve the dense, operational ERP interface. Avoid marketing-style sections, decorative cards, and oversized typography.
- Use Lucide icons for familiar actions.

## Non-Negotiable Domain Invariants

Every implementation and review must verify these rules:

1. Vendors may only access RFQs explicitly assigned to their linked vendor record.
2. Vendors may only access their own quotations, purchase orders, deliveries, invoices, and notifications.
3. Vendors must never see competing vendors' quotations or organization-wide internal reporting.
4. A vendor may submit at most one quotation per RFQ.
5. A quotation must price every RFQ item.
6. Quotations cannot be accepted after the RFQ deadline or once the approval workflow locks them.
7. Only Procurement Officers can create/send RFQs, compare quotations, recommend quotations, generate POs, and generate invoices.
8. Only Finance Officers can approve or reject procurement approvals and update invoice payment status.
9. A purchase order cannot be generated unless the selected quotation has an approved finance approval record.
10. An invoice cannot be generated without a purchase order.
11. Purchase order and invoice totals must derive from their source records.
12. Major workflow actions must create activity logs.
13. Important workflow transitions must create notifications for the affected users.
14. Business document numbers must use the existing readable format: `RFQ-YYYY-NNNN`, `QUO-YYYY-NNNN`, `PO-YYYY-NNNN`, and `INV-YYYY-NNNN`.

When changing workflow code, use a Prisma transaction so the state change, activity log, and notifications succeed or fail together.

## Roles and Authorization

Supported roles:

- `ADMIN`
- `PROCUREMENT_OFFICER`
- `FINANCE_OFFICER`
- `VENDOR`

All protected routes must use `protect`. Routes with restricted responsibilities must also use `authorize(...)`.

Authorization must be enforced in the backend even if the frontend hides an action.

For vendor-facing record access, verify record ownership using the authenticated user's linked `vendorId`. Never trust a client-provided vendor ID as proof of ownership.

Public signup may create only `VENDOR` users. Admin and internal officer accounts must be created by an authenticated Admin.

## Security Requirements

- Never commit `.env` files, database URLs, credentials, JWTs, SMTP passwords, logs, generated uploads, or private keys.
- Do not log access tokens, passwords, connection URLs, or sensitive request bodies.
- Passwords must be hashed with bcrypt before persistence.
- Password hashes must never appear in API responses.
- Use allowlists when accepting update payloads. Do not pass unrestricted `req.body` objects into Prisma updates.
- Validate request bodies with `express-validator` or explicit controller validation.
- Keep CORS restricted to `FRONTEND_URL`.
- Preserve Helmet and API/auth rate limiting.
- Keep internal errors generic for clients.
- Email errors must be captured in `email_logs` without exposing credentials.
- Use provider-required TLS/SSL options for remote PostgreSQL.
- Treat the seeded demo accounts and password as development-only data.
- Run dependency audits before pushing dependency changes.

If a secret is discovered in Git history or staged files, stop immediately. Remove it from the commit and notify the repository owner so it can be rotated.

## Environment Variables

Backend variables are documented in `backend/.env.example`.

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

Optional or environment-dependent:

- `PORT`
- `NODE_ENV`
- `JWT_EXPIRES_IN`
- `TRUST_PROXY`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

`EMAIL_USER` and `EMAIL_PASS` must be configured together.

Frontend configuration belongs in `frontend/.env` using the documented `VITE_API_URL`. Only variables prefixed with `VITE_` are exposed to the browser. Never place secrets in frontend environment variables.

## Database and Prisma Rules

`backend/prisma/schema.prisma` is the authoritative schema.

The hackathon team uses one shared PostgreSQL development database. Designate one migration owner at a time. Only that person should create and apply new development migrations. All other collaborators should pull committed migrations and run `prisma migrate deploy`.

When changing the schema:

1. Update `schema.prisma`.
2. If you are the designated migration owner, create a named development migration:

   ```powershell
   npm run prisma:migrate --prefix backend -- --name descriptive_change_name
   ```

3. Review the generated SQL before committing.
4. Update `seed.js` if the schema change affects required demo data.
5. Run Prisma validation and generate the client.
6. Commit both the schema change and generated migration.

If you are not the migration owner, do not run `prisma migrate dev` against the shared database. Coordinate the schema change with the migration owner.

Use `prisma migrate deploy` for shared, CI, staging, and production databases. Do not use `prisma db push` for committed schema changes.

Never edit an already-applied migration. Add a new migration instead.

Do not run the seed script against production.

Never reset, drop, truncate, or destructively clean the shared hackathon database. Announce migrations and seed operations to the team before running them. During manual testing, use uniquely named records and remove only records you created.

Use Decimal-compatible values for money and quantity fields. Avoid floating-point assumptions in business calculations.

## API and Swagger Rules

- Base path: `/api`
- Swagger path: `/api-docs`
- Every new major endpoint must have Swagger documentation.
- Use consistent HTTP status codes:
  - `200` successful read/update
  - `201` successful creation
  - `204` successful deletion without a body
  - `401` missing/invalid authentication
  - `403` authenticated but unauthorized
  - `404` record not found
  - `409` invalid workflow state or duplicate conflict
  - `422` request validation failure
- Expected business-rule failures should use `ApiError`.
- Do not expose Prisma error messages or stack traces.

## Activity Logs and Notifications

Use `logActivity` for major actions and `notify`/`notifyRole` for user-facing events.

At minimum, log:

- User and vendor creation/update
- RFQ creation and sending
- Quotation submission and selection
- Approval request and finance decision
- PO generation and status changes
- Invoice generation
- Delivery status changes

Descriptions should be understandable to an operator. Metadata must not contain passwords, tokens, or credentials.

## Seed Data Rules

The seed script must remain idempotent enough for repeated development use.

It should provide:

- Admin, Procurement Officer, Finance Officer, and Vendor demo users
- Vendor categories and vendors
- A representative RFQ/quotation/approval/PO/invoice workflow

When adding required schema fields, update seed data in the same change.

Do not add real customer, vendor, or employee data to seed files.

## Dependency Rules

- Prefer existing dependencies and platform APIs before adding packages.
- Pin Prisma client and CLI to matching versions.
- Commit updated lockfiles whenever dependencies change.
- Run audits after dependency updates:

  ```powershell
  npm audit --audit-level=low --prefix backend
  npm audit --audit-level=low --prefix frontend
  ```

- Do not use `npm audit fix --force` without reviewing breaking changes.

## Validation Requirements

Run the checks relevant to the change. Before pushing a broad change, run all of them.

Backend:

```powershell
npx prisma validate --schema backend/prisma/schema.prisma
npx prisma generate --schema backend/prisma/schema.prisma
npm run check --prefix backend
npm audit --audit-level=low --prefix backend
```

Frontend:

```powershell
npm run build --prefix frontend
npm audit --audit-level=low --prefix frontend
```

Runtime smoke checks:

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-WebRequest http://localhost:5000/api-docs/ -UseBasicParsing
Invoke-WebRequest http://localhost:5173 -UseBasicParsing
```

For authorization or workflow changes, test with the affected roles. Include at least one negative test confirming that an unauthorized role receives `403` or cannot access another vendor's data.

For database changes, coordinate with the migration owner before applying changes to the shared development database.

## Git and Collaboration Rules

- Keep commits focused and use clear imperative messages.
- Do not rewrite shared branch history without explicit approval.
- Fetch before pushing and confirm the remote branch has no unexpected collaborator changes.
- Do not commit generated `dist`, logs, uploads, `.env`, or `node_modules`.
- Include migrations, lockfiles, docs, and environment templates when they change.
- Run `git diff --check` before committing.
- Review staged files and scan staged content for secrets before pushing.
- Do not remove or revert unrelated collaborator changes.

Suggested pre-push review:

```powershell
git status --short --ignored
git diff --check
git diff --cached --stat
git diff --cached --name-only
```

## Definition of Done

A change is complete only when:

- The requested behavior is implemented end to end.
- Role authorization and vendor isolation remain correct.
- Required activity logs and notifications are included.
- Schema changes include reviewed migrations and seed updates where needed.
- Swagger and collaborator documentation are updated where relevant.
- No secrets or generated local files are staged.
- Relevant validation, build, audit, and runtime checks pass.
- Remaining limitations or unrun tests are clearly reported.
