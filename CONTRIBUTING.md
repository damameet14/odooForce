# Contributing

## Local Setup

1. Use Node.js 22 and PostgreSQL 14 or newer.
2. Install dependencies with `npm install` and `npm run install:all`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Set the privately shared hackathon `DATABASE_URL` and team JWT secret. Never commit either value.
5. Apply migrations with `npm run prisma:deploy --prefix backend`.
6. Run `npm run seed --prefix backend` only after confirming with the team that the shared database needs seeding.
7. Start the project with `npm run dev`.

## Shared Database Coordination

- The team uses one shared PostgreSQL development database.
- Designate one migration owner at a time.
- Only the migration owner runs `prisma migrate dev` and commits generated migrations.
- All other collaborators pull migrations and run `prisma migrate deploy`.
- Announce migrations and seed operations before running them.
- Never run database reset, drop, truncate, or destructive cleanup commands against the shared database.
- Use unique test records and remove only records you created.

## Before Opening a Pull Request

Run:

```powershell
npm run check --prefix backend
npx prisma validate --schema backend/prisma/schema.prisma
npm run build --prefix frontend
npm audit --audit-level=high --prefix backend
npm audit --audit-level=high --prefix frontend
```

Do not commit `.env` files, credentials, database URLs, generated uploads, logs, or `node_modules`.

Do not run the seed script against production.
