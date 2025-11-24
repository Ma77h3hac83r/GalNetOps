# Cloudflare Deployment Guide

Complete guide for deploying GalNetOps to Cloudflare Pages with Workers integration.

## Prerequisites

1. **Cloudflare account** (free tier works)
2. **GitHub repository** with your code
3. **Domain name** (optional, but recommended)
4. **Elite Dangerous CAPI credentials** (if using CAPI features)
   - Register at: https://www.frontierstore.net/account/api-access

## Step 1: Create Cloudflare D1 Database

GalNetOps uses a D1 SQL database for user and system data storage:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** > **D1**
3. Click **Create database**
4. Name it `galnetops-db` (or any name you prefer)
5. Select a region (choose the closest to your users)
6. Click **Create**
7. Copy the **Database ID** (you'll need this for `wrangler.toml`)

## Step 2: Run Database Migrations

1. Install Wrangler CLI if you haven't already:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Run the migration to create the database schema:
   ```bash
   wrangler d1 execute galnetops-db --file=./migrations/0001_initial_schema.sql
   ```

   **Note:** If you created the database with a different name, replace `galnetops-db` with your database name.

## Step 3: Update wrangler.toml

1. Open `wrangler.toml` in your project root
2. Replace the placeholder database ID with your actual D1 database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "galnetops-db"
database_id = "your-d1-database-id-here"
```

## Step 4: Set Up Cloudflare Pages Project

### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to **Workers & Pages** > **Pages**
2. Click **Create a project**
3. Select **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select your repository (`galnetops`)
6. Configure build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave as default)
   - **Node version**: 20
7. Click **Save and Deploy**

### Option B: Via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages project create galnetops
```

## Step 5: Configure Environment Variables

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Settings** > **Environment variables**
3. Add the following variables for **Production**:

```
ED_CAPI_CLIENT_ID=your_client_id_here
ED_CAPI_CLIENT_SECRET=your_client_secret_here
ED_CAPI_REDIRECT_URI=https://yourdomain.com/api/auth/callback
SESSION_SECRET=your_random_secret_here_min_32_chars
BASE_URL=https://yourdomain.com
```

**Important Notes:**
- `SESSION_SECRET` should be a long, random string (at least 32 characters)
- `ED_CAPI_REDIRECT_URI` must match your production domain
- `BASE_URL` should be your full production URL (with https://)

4. Optionally add the same variables for **Preview** environments (for testing)

## Step 6: Bind D1 Database to Pages

1. In your Cloudflare Pages project, go to **Settings** > **Functions**
2. Scroll to **D1 Database Bindings**
3. Click **Add binding**
4. Set:
   - **Variable name**: `DB`
   - **D1 database**: Select your `galnetops-db` database
5. Click **Save**

## Step 7: Configure Custom Domain

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name (e.g., `galnetops.com`)
4. Follow the DNS configuration instructions:
   - Add a CNAME record pointing to your Pages domain
   - Or use Cloudflare's automatic DNS configuration if your domain is already on Cloudflare
5. Cloudflare will automatically provision SSL certificates (may take a few minutes)

## Step 8: Set Up GitHub Actions (Optional but Recommended)

For automated deployments on every push to `main`:

1. **Get your Cloudflare API Token:**
   - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click **Create Token**
   - Use the **Edit Cloudflare Workers** template, or create a custom token with:
     - **Account** > **Cloudflare Pages** > **Edit** permissions
     - **Account** > **Account Settings** > **Read** (to get Account ID)
   - Click **Continue to summary** then **Create Token**
   - **Copy the token immediately** (you won't be able to see it again)

2. **Get your Cloudflare Account ID:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Click on any domain or go to **Workers & Pages** > **Overview**
   - Your Account ID is shown in the right sidebar, or in the URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/...`

3. **Add GitHub Secrets:**
   - In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**
   - Click **New repository secret**
   - Add `CLOUDFLARE_API_TOKEN` with the token you copied
   - Add another secret `CLOUDFLARE_ACCOUNT_ID` with your Account ID

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy on pushes to `main`.

**Note:** If you prefer not to use GitHub Actions, you can use Cloudflare Pages' built-in Git integration (see Step 3, Option A) which doesn't require API tokens.

## Step 9: Update ED CAPI Redirect URI

1. Go to [Frontier Developments API Access](https://www.frontierstore.net/account/api-access)
2. Find your application
3. Update the redirect URI to match your production domain:
   ```
   https://yourdomain.com/api/auth/callback
   ```
4. Save the changes

**Important:** The redirect URI must exactly match what you set in `ED_CAPI_REDIRECT_URI` environment variable.

## Step 10: Verify Deployment

1. Visit your Cloudflare Pages URL or custom domain
2. Test the following:
   - [ ] Site loads correctly
   - [ ] User registration works
   - [ ] User login works
   - [ ] ED account linking works (if CAPI is configured)
   - [ ] Journal file upload works (if implemented)
   - [ ] System search works
   - [ ] Commander dashboard displays correctly

## Local Development with Cloudflare

To test locally with Cloudflare Workers and D1:

```bash
# Install Wrangler globally if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a local D1 database for development
wrangler d1 create galnetops-db --local

# This will output a database ID. Update wrangler.toml with:
# [[d1_databases]]
# binding = "DB"
# database_name = "galnetops-db"
# database_id = "local"  # Use "local" for local development

# Run migrations on local database
wrangler d1 execute galnetops-db --local --file=./migrations/0001_initial_schema.sql

# Create a .env file with your environment variables
# Then run:
npm run dev
```

**Note:** For local development, you can use `database_id = "local"` in `wrangler.toml`. Wrangler will automatically create a local SQLite database for testing.

## Troubleshooting

### D1 Database Not Available Error

**Symptoms:** "D1 database not available" errors in console

**Solutions:**
- Ensure the D1 database is bound in Cloudflare Pages Functions settings
- Check that `wrangler.toml` has the correct database ID
- Verify the binding name matches exactly (`DB`, case-sensitive)
- Ensure migrations have been run: `wrangler d1 execute galnetops-db --file=./migrations/0001_initial_schema.sql`
- Redeploy after adding D1 bindings

### Environment Variables Not Working

**Symptoms:** CAPI linking fails, authentication errors

**Solutions:**
- Ensure variables are set in Cloudflare Pages dashboard (not just `.env` file)
- Check that variables are set for the correct environment (Production/Preview)
- Verify variable names are exactly correct (case-sensitive)
- Redeploy after adding or changing environment variables
- Check that `ED_CAPI_REDIRECT_URI` matches your actual domain

### Build Failures

**Symptoms:** Deployment fails during build step

**Solutions:**
- Check Node.js version (should be 20+)
- Ensure all dependencies are in `package.json`
- Review build logs in Cloudflare Pages dashboard
- Try building locally: `npm run build`
- Check for TypeScript errors: `npm run build` locally
- Verify `astro.config.mjs` is correctly configured

### GitHub Actions "apiToken" Error

**Symptoms:** `Error: Input required and not supplied: apiToken`

**Solutions:**
- Ensure `CLOUDFLARE_API_TOKEN` secret is set in GitHub repository settings
- Ensure `CLOUDFLARE_ACCOUNT_ID` secret is set in GitHub repository settings
- Go to **Settings** > **Secrets and variables** > **Actions** in your GitHub repository
- Verify both secrets are named exactly as shown (case-sensitive)
- Re-run the failed workflow after adding the secrets

### CAPI Linking Fails

**Symptoms:** OAuth redirect works but linking fails

**Solutions:**
- Verify `ED_CAPI_CLIENT_ID` and `ED_CAPI_CLIENT_SECRET` are correct
- Check that `ED_CAPI_REDIRECT_URI` exactly matches what's registered with Frontier
- Ensure the redirect URI uses `https://` (not `http://`)
- Check Cloudflare Pages logs for detailed error messages
- Verify your CAPI application is approved by Frontier Developments

### bcryptjs Errors in Production

**Symptoms:** Password hashing fails in Cloudflare Workers

**Solutions:**
- The project is configured to externalize `bcryptjs` in Vite SSR config
- If issues persist, check `astro.config.mjs` has the correct Vite SSR external configuration
- Verify `package.json` includes `bcryptjs` in dependencies

## Production Checklist

Before going live, verify:

- [ ] D1 database created (`galnetops-db`)
- [ ] Database migrations run successfully
- [ ] D1 database bound to Pages project (binding name: `DB`)
- [ ] All environment variables configured in Cloudflare dashboard
- [ ] Custom domain configured and SSL certificate active
- [ ] ED CAPI redirect URI updated to production domain
- [ ] GitHub Actions secrets configured (if using automated deployments)
- [ ] Test user registration flow
- [ ] Test user login flow
- [ ] Test ED account linking (if CAPI is configured)
- [ ] Test journal file upload (if implemented)
- [ ] Test system search functionality
- [ ] Verify commander dashboard displays correctly
- [ ] Check that data persists across page refreshes
- [ ] Test on mobile devices
- [ ] Verify HTTPS is working correctly

## Additional Configuration

### Project Name

The project name in `wrangler.toml` and GitHub Actions is set to `galnetops`. If you want to change this:

1. Update `wrangler.toml`: `name = "your-project-name"`
2. Update `.github/workflows/deploy.yml`: `projectName: your-project-name`
3. Update Cloudflare Pages project name in dashboard (optional)

### Build Configuration

The project uses:
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node version**: 20
- **Framework**: Astro with Cloudflare adapter

These are configured in Cloudflare Pages dashboard and can be adjusted if needed.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloudflare Pages build logs
3. Check browser console for client-side errors
4. Review Cloudflare Workers logs in the dashboard

---

*Happy deploying! Fly safe, Commander.*
