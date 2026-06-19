# Deployment Guide — SupportPilot AI

**Estimated time:** 30 minutes

---

## Overview

This guide walks through deploying SupportPilot AI to production:

- **Frontend** → Vercel
- **Backend** → Railway
- **Database** → Supabase (PostgreSQL + pgvector)
- **Redis** → Upstash Redis

---

## Step 1: Prerequisites

### Accounts needed:
- [GitHub](https://github.com) — repository hosting
- [Vercel](https://vercel.com) — frontend deployment
- [Railway](https://railway.app) — backend deployment
- [Supabase](https://supabase.com) — PostgreSQL database
- [Upstash](https://upstash.com) — Redis
- [Clerk](https://clerk.com) — authentication
- [OpenAI](https://platform.openai.com) — LLM provider
- [Stripe](https://stripe.com) — payments (optional for demo)

### Tools installed locally:
- Git
- Node.js 20+
- Python 3.12+
- Docker (optional, for local testing)

---

## Step 2: Push to GitHub

```bash
cd SupportPilot-AI
git init
git add .
git commit -m "Initial commit: SupportPilot AI v0.1.0"
git remote add origin git@github.com:shawon2210/SupportPilot-AI.git
git push -u origin main
```

---

## Step 3: Set Up Supabase (Database)

1. Create a new Supabase project
2. Copy the connection string from Settings → Database
3. Enable the pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Save the connection string for later: `postgresql+asyncpg://...`

---

## Step 4: Set Up Upstash (Redis)

1. Create an Upstash Redis database (free tier works)
2. Copy the Redis URL: `redis://...`
3. Save for Railway env vars

---

## Step 5: Set Up Clerk (Authentication)

1. Create a Clerk application
2. Get your API keys from API Keys → Quick Copy:
   - Publishable Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)
3. Set the JWKS URL: `https://your-app.clerk.accounts.dev/.well-known/jwks.json`
4. (Optional) Configure a webhook endpoint for user sync

---

## Step 6: Deploy Backend to Railway

### Option A: Connect GitHub repo (recommended)

1. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
2. Select your `SupportPilot-AI` repo
3. Railway will detect the Dockerfile and deploy

### Option B: CLI deploy

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Set environment variables on Railway:

```bash
railway variables set APP_ENV=production
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/supportpilot"
railway variables set REDIS_URL="redis://user:pass@host:6379"
railway variables set AI_PROVIDER=openai
railway variables set OPENAI_API_KEY="sk-xxx"
railway variables set CLERK_SECRET_KEY="sk_xxx"
railway variables set CLERK_PUBLISHABLE_KEY="pk_xxx"
railway variables set CLERK_JWKS_URL="https://xxx.clerk.accounts.dev/.well-known/jwks.json"
railway variables set CORS_ORIGINS="https://your-frontend-url.vercel.app"
railway variables set SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
```

### Verify deployment:

```bash
# Check health endpoint
curl https://your-app.up.railway.app/api/v1/health

# Should return: {"status":"healthy","version":"0.1.0"}
```

### Seed demo data:

```bash
railway run python -m scripts.demo_data
```

---

## Step 7: Deploy Frontend to Vercel

### Option A: Connect GitHub repo (recommended)

1. Go to [Vercel](https://vercel.com) → Add New → Project
2. Import your `SupportPilot-AI` repo
3. Vercel auto-detects Next.js — no config needed
4. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
5. Click Deploy

### Option B: CLI deploy

```bash
npm install -g vercel
cd frontend
vercel
```

---

## Step 8: Verify Deployment

### Health checks:
```bash
# Backend
curl https://your-backend.up.railway.app/api/v1/health

# Frontend
curl -I https://your-frontend.vercel.app
```

### End-to-end test:
1. Open https://your-frontend.vercel.app
2. Sign in with demo credentials or create new account
3. Create a workspace
4. Upload a document
5. Ask a question in chat
6. Configure the widget
7. Check analytics dashboard

---

## Step 9: Set Up Custom Domains (Optional)

### Frontend:
1. Vercel → Settings → Domains
2. Add your domain (e.g., `supportpilot.yourdomain.com`)
3. Update DNS records as instructed

### Backend:
1. Railway → Settings → Networking → Custom Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update DNS records

---

## Step 10: Post-Deploy Checklist

- [ ] Backend health endpoint responds
- [ ] Frontend loads without errors
- [ ] Sign in / Sign up works
- [ ] Workspace creation works
- [ ] Document upload works
- [ ] Chat with RAG works
- [ ] Widget embed works
- [ ] Analytics dashboard shows data
- [ ] Stripe checkout works (test mode)
- [ ] Sentry receives error events
- [ ] Rate limiting is active
- [ ] CORS allows frontend origin

---

## Troubleshooting

### Backend returns 502:
- Check `railway logs` for startup errors
- Verify all env vars are set
- Ensure database is accessible (check Supabase allowlist)

### Frontend shows blank page:
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure CORS allows your frontend origin

### Database connection fails:
- Check Supabase connection string format
- Ensure your IP is allowed (Supabase → Settings → Network)
- Verify pgvector extension is enabled

### Auth doesn't work:
- Verify Clerk keys match (test vs production)
- Check JWKS URL is accessible
- Ensure callback URLs are configured in Clerk

---

## Cost Estimates (Free Tier)

| Service | Free Tier |
|---------|-----------|
| Vercel | 100GB bandwidth, unlimited sites |
| Railway | $5 credit/month, 500 hours |
| Supabase | 500MB database, 1GB storage |
| Upstash | 10K requests/day |
| Clerk | 10K monthly active users |
| OpenAI | $5 test credit |
| Stripe | No monthly fee (per-transaction) |

**Total monthly cost for demo: $0-5**

---

## Scaling Path

When you outgrow free tiers:

| Service | Paid Tier | Cost |
|---------|-----------|------|
| Vercel Pro | $20/month | Analytics, bandwidth |
| Railway Pro | $5/month | More compute, private networking |
| Supabase Pro | $25/month | 8GB database, 100GB storage |
| Upstash Pro | $10/month | Higher request limits |
| Clerk | $25/month | 25K MAU |

**Total for small production: ~$85/month**
