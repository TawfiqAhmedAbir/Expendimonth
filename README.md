# Expendimonth

Mobile-first PWA for tracking monthly **money in** and **money out** for one house—built for clear totals, history, charts, and photo attachments. Data stays in the browser (IndexedDB).

**Live:** [https://expendimonth.pages.dev](https://expendimonth.pages.dev)  
**GitHub:** [github.com/TawfiqAhmedAbir/Expendimonth](https://github.com/TawfiqAhmedAbir/Expendimonth)

## Local development

```bash
npm install
npm run dev
```

## Tests and build

```bash
npm run test
npm run build
```

## Deploy (Cloudflare Pages)

Production deploys run on push to `main` via GitHub Actions (`.github/workflows/cloudflare-pages.yml`).

1. Create a Cloudflare API token with **Cloudflare Pages — Edit** permission.
2. Add it to the GitHub repo as secret `CLOUDFLARE_API_TOKEN`.

Manual deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=expendimonth --branch=main
```

SPA routing uses `public/_redirects` (`/* → /index.html`).
