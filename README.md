# GalNetOps Dashboard

A fast, modern, space-data platform for Elite Dangerous pilots.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Tech Stack

- Astro (with Cloudflare adapter)
- TailwindCSS
- Lexend font family
- Cloudflare Pages & Workers
- Cloudflare KV (for user storage)
- bcryptjs (password hashing)

## User Account System

GalNetOps uses a two-step account system:

1. **Create a GalNetOps account** - Users register with email, username, and password
2. **Link Elite Dangerous account** (optional) - Users can link their ED account via CAPI to access commander data

## Elite Dangerous CAPI Setup

To enable ED account linking via the Elite Dangerous Companion API (CAPI), you need to:

1. **Register your application** with Frontier Developments:
   - Visit https://www.frontierstore.net/account/api-access
   - Create a new application
   - Note your Client ID and Client Secret

2. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```env
   ED_CAPI_CLIENT_ID=your_client_id_here
   ED_CAPI_CLIENT_SECRET=your_client_secret_here
   ED_CAPI_REDIRECT_URI=http://localhost:4321/api/auth/callback
   SESSION_SECRET=your_random_session_secret_here
   BASE_URL=http://localhost:4321
   ```

3. **Update redirect URI for production**:
   When deploying, update `ED_CAPI_REDIRECT_URI` and `BASE_URL` to your production domain.

**Note:** Users must create a GalNetOps account first, then they can optionally link their ED account.

## Features

- User registration and authentication
- OAuth2 linking with Elite Dangerous CAPI
- Commander profile data display
- Session management
- Cloudflare KV storage for user accounts

## Deployment

This project is configured for deployment on **Cloudflare Pages** with **Cloudflare Workers** integration.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Start

1. Create a Cloudflare KV namespace named `USERS`
2. Update `wrangler.toml` with your KV namespace ID
3. Connect your GitHub repository to Cloudflare Pages
4. Configure environment variables in Cloudflare dashboard
5. Bind KV namespace in Pages Functions settings

For complete setup instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

