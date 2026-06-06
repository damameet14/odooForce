# VendorBridge

Full-stack procurement and vendor management ERP built with React, Express, Prisma, and PostgreSQL.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   npm run install:all
   ```

2. Copy `backend/.env.example` to `backend/.env`, then set the privately shared hackathon PostgreSQL connection URL and JWT secret:

   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
   JWT_SECRET=replace_with_at_least_32_random_characters
   ```

   For hosted PostgreSQL providers, retain any required SSL query parameters from the provider's connection URL.

   Every collaborator may use the same shared development database, but the real URL must never be committed.

3. Apply committed migrations:

   ```powershell
   cd backend
   npm run prisma:deploy
   ```

   Run `npm run seed` only when the team confirms the shared database needs initial demo data.

4. Start both applications from the repository root:

   ```powershell
   npm run dev
   ```

## URLs

- Web application: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Swagger documentation: `http://localhost:5000/api-docs`
- Health check: `http://localhost:5000/health`

## Demo Accounts

All seeded accounts use password `password123`.

- `admin@vendorbridge.com`
- `procurement@vendorbridge.com`
- `finance@vendorbridge.com`
- `vendor@vendorbridge.com`

Seeded credentials are for development and demos only. Replace or disable them before production use.

## Shared Hackathon Database

- Share the connection URL through a private team channel, not GitHub.
- Each collaborator stores the same URL in their local ignored `backend/.env`.
- Designate one teammate as the migration owner.
- Only the migration owner creates and applies new migrations to the shared database.
- Other teammates pull the committed migration and use `npm run prisma:deploy --prefix backend`.
- Coordinate before running the seed script because it changes shared data.
- Do not reset, drop, truncate, or force-push schema changes against the shared database.

## Validation

```powershell
cd backend
npx prisma validate
npx prisma generate
npm run check

cd ../frontend
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the collaborator workflow and [SECURITY.md](SECURITY.md) for deployment requirements.
