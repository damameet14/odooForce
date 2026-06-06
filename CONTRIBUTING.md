# Contributing

## Local Setup

1. Use Node.js 22 and PostgreSQL 14 or newer.
2. Install dependencies with `npm install` and `npm run install:all`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Set a collaborator-specific `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters.
5. Apply migrations with `npm run prisma:deploy --prefix backend`.
6. Seed a development database with `npm run seed --prefix backend`.
7. Start the project with `npm run dev`.

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

Use a dedicated development database. Do not run the seed script against production.

