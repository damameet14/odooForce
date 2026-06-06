# Security Policy

## Reporting

Do not open public issues containing credentials, personal data, or exploit details. Report security concerns privately to the repository owner through GitHub.

## Required Practices

- Keep all secrets in environment variables. Never commit `.env` files.
- Use a unique, random `JWT_SECRET` of at least 32 characters in each environment.
- Use TLS and provider-required SSL parameters for remote PostgreSQL connections.
- Rotate database and SMTP credentials immediately if they are exposed.
- Run `npm audit` and review dependency updates before releases.
- Apply production migrations with `prisma migrate deploy`, not `prisma migrate dev`.
- Restrict production CORS origins through `FRONTEND_URL`.
- Set `TRUST_PROXY=true` only when the API is behind a trusted reverse proxy.
- Replace or disable seeded demo accounts before production use.

