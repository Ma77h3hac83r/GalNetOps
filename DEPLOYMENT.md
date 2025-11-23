# Cloudflare Deployment Guide

This guide will help you deploy GalNetOps to Cloudflare Pages with Workers integration.

## Prerequisites

1. Cloudflare account
2. GitHub repository with your code
3. Domain name (optional, but recommended)

## Step 1: Create Cloudflare KV Namespace

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** > **KV**
3. Click **Create a namespace**
4. Name it `USERS` (or any name you prefer)
5. Copy the **Namespace ID**

## Step 2: Update wrangler.toml

1. Open `wrangler.toml`
2. Replace `your-kv-namespace-id-here` with your actual KV namespace ID:

```toml
[[kv_namespaces]]
binding = "USERS"
id = "your-actual-kv-namespace-id"
```

## Step 3: Set Up Cloudflare Pages Project

### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to **Workers & Pages** > **Pages**
2. Click **Create a project**
3. Select **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select your repository
6. Configure build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave as default)
7. Click **Save and Deploy**

### Option B: Via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages project create galnetops-dashboard
```

## Step 4: Configure Environment Variables

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Settings** > **Environment variables**
3. Add the following variables for **Production**:

```
ED_CAPI_CLIENT_ID=your_client_id
ED_CAPI_CLIENT_SECRET=your_client_secret
ED_CAPI_REDIRECT_URI=https://yourdomain.com/api/auth/callback
SESSION_SECRET=your_random_secret_here
BASE_URL=https://yourdomain.com
```

4. Optionally add the same variables for **Preview** environments

## Step 5: Bind KV Namespace to Pages

1. In your Cloudflare Pages project, go to **Settings** > **Functions**
2. Scroll to **KV Namespace Bindings**
3. Click **Add binding**
4. Set:
   - **Variable name**: `USERS`
   - **KV namespace**: Select your `USERS` namespace
5. Click **Save**

## Step 6: Configure Custom Domain (Optional)

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Cloudflare will automatically provision SSL certificates

## Step 7: Set Up GitHub Actions (Optional)

If you want automated deployments via GitHub Actions:

1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**
2. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Get from [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
     - Create token with **Account** > **Cloudflare Pages** > **Edit** permissions
   - `CLOUDFLARE_ACCOUNT_ID`: Found in Cloudflare Dashboard URL or Workers overview

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy on pushes to `main`.

## Step 8: Update ED CAPI Redirect URI

1. Go to [Frontier Developments API Access](https://www.frontierstore.net/account/api-access)
2. Update your application's redirect URI to match your production domain:
   ```
   https://yourdomain.com/api/auth/callback
   ```

## Local Development with Cloudflare

To test locally with Cloudflare Workers:

```bash
# Install Wrangler globally if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a local KV namespace for development
wrangler kv:namespace create "USERS" --preview

# Update wrangler.toml with the preview namespace ID
# Then run:
npm run dev
```

For local development, you can also use the file-based storage by keeping the original `users.ts` implementation.

## Troubleshooting

### KV Not Available Error

- Ensure KV namespace is bound in Cloudflare Pages Functions settings
- Check that `wrangler.toml` has the correct namespace ID
- Verify the binding name matches (`USERS`)

### Environment Variables Not Working

- Ensure variables are set in Cloudflare Pages dashboard (not just `.env` file)
- Check that variables are set for the correct environment (Production/Preview)
- Redeploy after adding new environment variables

### Build Failures

- Check Node.js version (should be 20+)
- Ensure all dependencies are in `package.json`
- Review build logs in Cloudflare Pages dashboard

## Production Checklist

- [ ] KV namespace created and bound
- [ ] Environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] ED CAPI redirect URI updated
- [ ] GitHub Actions secrets configured (if using)
- [ ] SSL certificate provisioned (automatic with Cloudflare)
- [ ] Test registration and login flows
- [ ] Test ED account linking

