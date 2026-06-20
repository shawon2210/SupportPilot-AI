# SupportPilot AI — Railway Deployment Steps

Since the Railway CLI cannot authenticate from WSL, deploy manually via the dashboard.

## Prerequisites
- GitHub repo pushed (DONE — latest commit ebe2cda)
- Railway project exists (81cba11d-4508-4678-a1c3-c745bd487e2b)
- Railway service exists (2801521c-4a4e-41fd-a6d3-01795d68a9ad)

## Step 1: Add PostgreSQL Database

1. Go to: https://railway.com/project/81cba11d-4508-4678-a1c3-c745bd487e2b
2. Click **New** → **Database** → **Add PostgreSQL**
3. Railway will auto-provide `DATABASE_URL` and `POSTGRES_PASSWORD` env vars
4. The `DATABASE_URL` will be in `postgresql://...` format — our app auto-converts it to `postgresql+asyncpg://...`

## Step 2: Configure Backend Service

1. Click on your backend service (2801521c)
2. Go to **Settings** tab:
   - **Build**: Dockerfile (already configured)
   - **Custom Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
   - **Healthcheck Path**: `/api/v1/health`
   - **Healthcheck Timeout**: 60

3. Go to **Environment** tab and add:

```
APP_ENV=production
SECRET_KEY=cf5b6d2a940b81134093d5486111b50a89532972feee701a403f1c6551b68ea4
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<your-key>
CORS_ORIGINS=["https://your-frontend.vercel.app"]
METRICS_ENABLED=true
LOG_LEVEL=LOG_LEVEL=INFO
```

4. Go to **Networking** → **Generate Domain** (get a public URL like `https://supportpilot-api.up.railway.app`)

## Step 3: Deploy

1. Click **Deploy** button (or push to main branch — Railway auto-deploys on git push)
2. Wait for build to complete (~2-3 min)
3. Check health: `curl https://your-api.up.railway.app/api/v1/health`

## Step 4: Deploy Frontend to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo (shawon2210/SupportPilot-AI)
3. Set root directory: `frontend`
4. Add env var: `NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1`
5. Deploy

## Step 5: Update CORS

After frontend is deployed:
1. Go back to Railway backend env vars
2. Update `CORS_ORIGINS` to include your Vercel URL:
   `CORS_ORIGINS=["https://your-frontend.vercel.app","https://*.vercel.app"]`
3. Redeploy

## Verification Checklist

- [ ] Backend health check returns 200
- [ ] Frontend loads at Vercel URL
- [ ] Sign-in page renders
- [ ] Can create workspace
- [ ] Can upload document
- [ ] Can start chat session
