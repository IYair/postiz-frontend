# Postiz Frontend

Frontend deployable for Postiz on Vercel.

## Vercel

Use the repository root as the Vercel root directory. `vercel.json` runs:

```bash
pnpm run prisma-generate && pnpm run build:frontend
```

Required production variables:

```env
FRONTEND_URL=https://app.your-domain.com
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com/api
BACKEND_INTERNAL_URL=https://api.your-domain.com/api
BACKEND_URL=https://api.your-domain.com/api
JWT_SECRET=the-same-value-used-by-backend
IS_GENERAL=true
SENTRY_DISABLE=true
DISABLE_SOURCE_MAPS=true
```

Use the same root domain for frontend and backend subdomains so auth cookies work correctly.
