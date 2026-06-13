# Automated Affiliate Marketing Portal

This project is a full-stack Next.js and Express application designed to save products in Supabase and automatically post them concurrently to **Telegram** and **Instagram**.

## Architecture Overview

1. **Frontend (Next.js)**: Runs the user interface, manages Supabase storage uploads directly from the browser, and renders the analytics dashboard. Deployed on **Vercel**.
2. **Backend (Express & Python)**: Runs a Node/Express server that executes Python automation scripts (Telegram & Instagram Graph APIs). Deployed on **Render** (which provides a Linux container environment with native Python 3 support).

---

## Local Development

### 1. Supabase Setup
Create a `products` table in your Supabase SQL editor using the schema script found in [create_products_table.sql](file:///d:/Affilate%20marketing/supabase/create_products_table.sql).

### 2. Consolidated Environment Config
Copy the variables from [.env.example](file:///d:/Affilate%20marketing/.env.example) and populate them. Create a `.env` file in the **root** folder and another `.env` file inside the `backend` folder.

### 3. Running Frontend
From the root directory:
```bash
npm install
npm run dev
```
The frontend will run on **http://localhost:3000** (or http://localhost:3001 if port 3000 is occupied).

### 4. Running Backend
From the `backend/` directory:
```bash
cd backend
npm install
npm start
```
The backend will run on **http://localhost:5000**.

---

## Production Deployment

### 1. Deploying the Backend on Render
1. Sign up/Log in to [Render](https://render.com/).
2. Click **New** -> **Web Service**.
3. Link your GitHub repository.
4. Set the following configurations:
   - **Name**: `affiliate-marketing-backend`
   - **Environment**: `Node`
   - **Region**: Select closest to your database
   - **Root Directory**: `backend` (This points Render directly to our subfolder!)
   - **Build Command**: `npm install && pip install requests`
   - **Start Command**: `node server.js`
5. Go to the **Environment** tab on Render and add all backend variables from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `IG_USER_ID`
   - `ACCESS_TOKEN`
   - `FRONTEND_URL` (Points to your Vercel deployment URL, e.g., `https://your-app.vercel.app`)

### 2. Deploying the Frontend on Vercel
1. Sign up/Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set the following configurations:
   - **Root Directory**: Keep empty (root of the repo)
   - **Framework Preset**: `Next.js`
5. Expand the **Environment Variables** section and add all frontend variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BACKEND_URL` (Points to your Render backend URL, e.g. `https://your-backend.onrender.com`)
6. Click **Deploy**.

---

## Features Built-in

- **Render Wake-up Warmup**: When the frontend page loads, it triggers an asynchronous `/health` check to wake up the Render free instance while the user is filling out the form, preventing slow load times on submit.
- **Request Timeout & Retries**: API calls are configured with a 60-second timeout and will automatically retry once on failure.
- **CORS Protection**: Access to the backend is secured to only allow requests from your specified `FRONTEND_URL` in production.
