# SupportPilot AI — Deployment Guide

## Overview

This guide walks through deploying SupportPilot AI to production using:
- **Backend**: Railway
- **Frontend**: Vercel
- **Database**: Supabase (PostgreSQL + pgvector)
- **File Storage**: Supabase Storage
- **Monitoring**: Sentry (free tier)

---

## Prerequisites

1. GitHub repo with the codebase
2. Railway account (railway.app)
3. Vercel account (vercel.com)
4. Supabase account (supabase.com)
5. Clerk account (clerk.com)
6. Stripe account (stripe.com)

---

## Step 1: Supabase Setup

### Create Project

1. Go to supabase.com → New Project
2. Name: `supportpilot-production`
3. Region: closest to your users
4. Save the database password — you'll need it

### Enable pgvector

In the Supabase SQL Editor, run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Run Migrations

The backend auto-migrations on startup, but you can also run them manually:

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql+asyncpg://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"

# Run Alembic migrations
cd backend
alembic upgrade head
```

### Create Storage Bucket

In Supabase Dashboard → Storage:

1. Create bucket: `documents`
2. Set to **Private** (not public)
3. Add RLS policy:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

-- Allow authenticated reads
CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'documents');
```

### Get API Keys

Save these from Supabase Dashboard → Settings → API:
- `SUPABASE_URL` (Project URL)
- `SUPABASE_SERVICE_KEY` (service_role key — keep secret)
- `SUPABASE_ANON_KEY` (anon key — for frontend)

---

## Step 2: Clerk Setup

1. Go to clerk.com → Create Application
2. Name: `SupportPilot AI`
3. Configure sign-in methods (Email, Google OAuth recommended)
4. Get your keys from API Keys page:
   - `CLERK_PUBLISHABLE_KEY` (frontend)
   - `CLERK_SECRET_KEY` (backend)
   - `CLERK_JWKS_URL` (backend — for JWT verification)

### Configure Webhook

1. Go to Webhooks → Add Endpoint
2. URL: `https://your-api.supportpilot.ai/api/v1/auth/webhook`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. Save the webhook signing secret as `CLERK_WEBHOOK_SECRET`

---

## Step 3: Railway Deployment

### Create Project

1. Go to railway.app → New Project
2. Deploy from GitHub repo
3. Select the `backend` directory as the root

### Environment Variables

In Railway → Variables, add:

```bash
APP_ENV=production
DATABASE_URL=postgresql+asyncpg://postgres:<supabase-password>@db.<project-ref>.supabase.co:5432/postgres
REDIS_URL=redis://redis:6379/0

# AI Provider (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Auth
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Monitoring
SENTRY_DSN=https://...
POSTHOG_API_KEY=phc_...

# CORS
CORS_ORIGINS=https://supportpilot.ai,https://www.supportpilot.ai

# Security
SECRET_KEY=<generate-32-char-random-string>
```

### Generate SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Redis on Railway

1. In the same Railway project, add a Redis service
2. Railway auto-injects `REDIS_URL` — use that value

### Health Check

Railway auto-detects the `/api/v1/health` endpoint. Verify:
- Health check path: `/api/v1/health`
- Port: `8000`

### Custom Domain

1. Railway → Settings → Domains
2. Add: `api.supportpilot.ai`
3. Update DNS CNAME record as instructed

---

## Step 4: Vercel Deployment (Frontend)

### Connect Repository

1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Framework: Next.js
4. Root directory: `frontend` (if you have one) or configure as needed

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.supportpilot.ai
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Custom Domain

1. Vercel → Settings → Domains
2. Add: `supportpilot.ai` and `www.supportpilot.ai`
3. Update DNS records as instructed

---

## Step 5: Stripe Setup

### Create Products

In Stripe Dashboard:

1. Create 4 products:
   - **Free** — $0/month (no Stripe product needed)
   - **Starter** — $29/month → Save Price ID as `STRIPE_PRICE_STARTER`
   - **Pro** — $99/month → Save Price ID as `STRIPE_PRICE_PRO`
   - **Enterprise** — $299/month → Save Price ID as `STRIPE_PRICE_ENTERPRISE`

### Configure Webhook

1. Stripe → Developers → Webhooks → Add Endpoint
2. URL: `https://api.supportpilot.ai/api/v1/billing/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Save the webhook signing secret as `STRIPE_WEBHOOK_SECRET`

---

## Step 6: Sentry Setup

1. Go to sentry.io → Create Project
2. Platform: Python (FastAPI)
3. Copy the DSN
4. Add `SENTRY_DSN` to Railway environment variables

---

## Step 7: Verify Deployment

### Health Check

```bash
curl https://api.supportpilot.ai/api/v1/health
# Expected: {"status":"healthy","version":"0.1.0"}
```

### Readiness Check

```bash
curl https://api.supportpilot.ai/api/v1/health/ready
# Expected: {"status":"ready","database":"connected"}
```

### Create a Test Workspace

```bash
# Sign up via the frontend, then:
curl -X POST https://api.supportpilot.ai/api/v1/workspaces \
  -H "Authorization: Bearer <clerk-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workspace", "slug": "test-workspace"}'
```

---

## Step 8: CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Lint** — Ruff
2. **Security** — Bandit + Safety
3. **Test** — pytest (97 tests)
4. **Build** — Docker image
5. **Deploy** — Railway (auto-deploy on main branch)

To enable auto-deploy on Railway:
1. Railway → Project → Settings → Deploy
2. Connect to GitHub
3. Enable auto-deploy on `main` branch

---

## Cost Estimates (Free Tier)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Railway | $5 credit/month | Enough for 1-2 services |
| Vercel | 100GB bandwidth | Generous free tier |
| Supabase | 500MB DB + 1GB storage | Enough for MVP |
| Clerk | 10K MAU | Generous free tier |
| Stripe | No monthly fee | 2.9% + 30c per transaction |
| Sentry | 5K events/month | Enough for monitoring |
| PostHog | 1M events/month | Very generous free tier |

**Total monthly cost for MVP: ~$0–$20**

---

## Troubleshooting

### Database Connection Failures

- Verify `DATABASE_URL` format: `postgresql+asyncpg://user:pass@host:5432/db`
- Check Supabase's "Connection Pooling" settings
- Ensure IP allowlist isn't blocking Railway

### Redis Connection Failures

- Railway Redis auto-injects `REDIS_URL`
- Verify the URL format: `redis://redis:6379/0`

### Clerk Auth Failures

- Verify `CLERK_SECRET_KEY` matches the Clerk dashboard
- Check that the JWT audience matches your API URL
- Ensure the Clerk webhook signing secret is correct

### Stripe Webhook Failures

- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check that the webhook URL is accessible (not behind auth)
- Test with Stripe CLI: `stripe listen --forward-to localhost:8000/api/v1/billing/webhook`
