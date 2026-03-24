# CyberWorld Multiplayer Server

Backend service for Operation Starshield multiplayer progression, email login, and chapter/subscription gating.

## Features

- Email/password registration and login
- JWT-based auth
- Progress API with chapter gate checks
- Gate policy:
  - Chapters 1-3: open
  - Chapter 4: requires authenticated account (free tier)
  - Chapter 5+: requires basic subscription
- Mock subscription activation endpoint (replace with real checkout)
- Socket.IO realtime presence + lobby + chat events

## Setup

1. Copy `.env.example` to `.env`
2. Set values:
   - `JWT_SECRET`
  - `APP_ORIGIN` (comma-separated allowed origins, for example `http://127.0.0.1:5500,https://personfu.github.io,https://fllc.net`)
   - optionally `STRIPE_CHECKOUT_URL`

3. Install and run:

```bash
cd multiplayer-server
npm install
npm run dev
```

Server starts on `http://localhost:8787` by default.

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/world/state`
- `GET /api/gate?chapter=N`
- `GET /api/progress`
- `POST /api/progress`
- `POST /api/subscription/create-checkout`
- `POST /api/subscription/activate-basic`

## Hosting Starter Notes

- Deploy this service to a managed Node host (Render, Railway, Fly.io, Azure App Service, etc.)
- Put every production frontend origin into `APP_ORIGIN`
- Replace mock subscription endpoints with Stripe Checkout + webhook updates
- Migrate `db.json` to a managed SQL DB before production launch

For GitHub Pages + custom domain setups, allow both origins in `APP_ORIGIN` so the same backend can serve `personfu.github.io` and `fllc.net`.
