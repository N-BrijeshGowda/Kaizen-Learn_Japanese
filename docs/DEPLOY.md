# Hosting Kaizen for free: Render + Aiven

Render runs the website. Aiven holds the MySQL database. Neither needs a credit card.

| Part | Service | Free limits to know |
|---|---|---|
| Website | Render free web service | 512 MB RAM, sleeps after 15 minutes without visits, about 750 hours a month |
| Database | Aiven for MySQL, free plan | 1 CPU, 1 GB RAM, 1 GB storage, one free MySQL service per account |
| Keep-awake and daily job | cron-job.org (free) | Pings the site and runs the daily streak job |

Do the steps in order.

## 1. Put the code on GitHub

1. Create an empty repository on github.com (private is fine).
2. In `kaizen-app`:
   ```
   git add -A
   git commit -m "Prepare for deployment"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
   `.env` is ignored by git, so no secrets are uploaded.

## 2. Create the Aiven database

1. Sign up at aiven.io (no card), then **Create service** > **MySQL** > choose the **Free** plan.
2. Pick the region closest to Singapore (Render's region below). Wait until the service says **Running**.
3. Open the service **Overview**. Copy the **Service URI**. It looks like
   `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED`
4. Change the end so it reads `?sslaccept=accept_invalid_certs`:
   `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslaccept=accept_invalid_certs`
   This is your production `DATABASE_URL`. Keep it secret.
5. Optional but better: copy the **CA certificate** from the same page. You will paste it as `DATABASE_CA` so the app verifies the server.

## 3. Load the tables and content (from your laptop, once)

In PowerShell, inside `kaizen-app`:
```
$env:DATABASE_URL = "mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslaccept=accept_invalid_certs"
npx prisma migrate deploy
npm run db:seed
```
This builds the tables and loads the 125 items and 24 role-plays. The environment variable only lasts for that window.

## 4. Create the Render service

1. Sign up at render.com with GitHub.
2. **New** > **Blueprint**, pick your repository. Render reads `render.yaml`.
3. When asked, fill in:
   - `DATABASE_URL`: the URL from step 2.4
   - `DATABASE_CA`: the certificate from step 2.5 (or leave empty)
4. **Apply**. The first build takes several minutes. When it is live you get an address like `https://kaizen-xxxx.onrender.com`.
5. Open **Environment** for the service and copy the generated `CRON_SECRET` (needed in step 6).

If the build stops with "out of memory", tell me and we will adjust the build.

## 5. Make yourself admin

Register an account on the live site, then on your laptop (same `DATABASE_URL` as step 3):
```
$env:DATABASE_URL = "mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslaccept=accept_invalid_certs"
npm run make-admin -- you@company.com
```

## 6. Keep it awake and run the daily job (cron-job.org)

Create a free account at cron-job.org, then two jobs:

1. **Keep awake**: URL `https://<your-site>.onrender.com/api/health`, every 10 minutes, method GET. This stops Render sleeping, and it keeps the Aiven database active too.
2. **Daily streak job**: URL `https://<your-site>.onrender.com/api/internal/rollover`, method POST, once a day at 00:05 in the Asia/Kolkata time zone, with the header `x-cron-secret: <CRON_SECRET from step 4.5>`.

## Updating the site later

Push to GitHub. Render rebuilds and restarts by itself, and pending migrations run on start.

## Backups

Aiven's free plan has limited backups. Before big changes, dump the database from your laptop:
```
mysqldump --ssl-mode=REQUIRED -h HOST -P PORT -u avnadmin -p defaultdb > backup.sql
```
