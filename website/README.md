# GalNetOps Website

Simple “Work in progress — Coming soon” landing page for GalNetOps, built with Astro and Tailwind.

## Local development

```bash
cd website
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build

```bash
npm run build
```

Output is in `dist/`. Preview with:

```bash
npm run preview
```

## Cloudflare Pages (GitHub Action)

The repo includes a workflow (`.github/workflows/deploy-website.yml`) that builds and deploys this site to Cloudflare Pages on pushes to `main` that touch `website/`.

### One-time setup

1. **Create a Pages project** in Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Create a project** → **Direct Upload**. Name it `galnetops-website` (or match the name in the workflow).

2. **Create an API token**: [API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) → **Create Token** → **Custom token** → **Get started**. Permissions: **Account** → **Cloudflare Pages** → **Edit**. Create and copy the token.

3. **Add GitHub secrets** (repo **Settings** → **Secrets and variables** → **Actions**):
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID (right-hand sidebar on any dashboard page).
   - `CLOUDFLARE_API_TOKEN` — the token from step 2.

After that, pushes to `main` that change files under `website/` will trigger a build and deploy. You can also run **Actions** → **Deploy website to Cloudflare Pages** → **Run workflow** manually.

### Config

- **`website/wrangler.toml`** — Pages project name and compatibility; `pages_build_output_dir` points at `./dist`.

If the site is served from a subpath (e.g. `example.com/galnetops`), set `site` in `astro.config.mjs` to that base path. Custom domains are set under the Pages project’s **Custom domains**.
