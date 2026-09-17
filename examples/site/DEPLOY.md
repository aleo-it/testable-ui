# Deploying the demo site to GitHub Pages

The site (`examples/site`) builds to static assets with **relative asset paths**
(`base: './'`), so the same build works locally and at any GitHub Pages
subpath — no per-repo path config needed.

## Local development

```sh
pnpm install
pnpm --filter @testable-ui/core build   # site imports core from dist/
pnpm --filter @testable-ui/site dev     # http://localhost:5173
pnpm --filter @testable-ui/site build   # production build -> examples/site/dist
pnpm --filter @testable-ui/site preview
```

> The site runs the REAL `@testable-ui/core` naming engine in the browser.
> `vite.config.ts` aliases `node:crypto` to a tiny sync SHA-256 shim
> (`src/lib/cryptoShim.ts`) so ids match a real build byte-for-byte.
> Parity is enforced by `src/lib/demoEngine.test.ts`, which compares scanner
> output against the actual swc-based `@testable-ui/vite` transform.

## One-time setup (GitHub CLI)

```sh
# 1. Authenticate gh (opens a browser prompt)
gh auth login

# 2. Create a remote repository for the library
gh repo create testable-ui --public --source . --remote origin --push
```

(Already have a repo? `git remote add origin git@github.com:<you>/testable-ui.git`)

## Deploy

```sh
git add -A && git commit -m "chore: initial import"
git push -u origin main
```

## Enable Pages (done once, in the browser)

1. https://github.com/<you>/testable-ui → **Settings → Pages**
2. **Source**: *GitHub Actions* (not "Deploy from a branch")
3. The workflow `.github/workflows/pages.yml` then builds + deploys on every
   push to `main` and exposes the site at
   `https://<you>.github.io/testable-ui/`

## Trigger a redeploy later

Any push to `main` touching `examples/site/**`, `packages/core/**`, the
lockfile, or the workflow rebuilds the site. You can also re-run the workflow
manually: **Actions → "Deploy site to GitHub Pages" → Run workflow**.