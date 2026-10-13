# Expendimonth

Mobile-first PWA for tracking monthly **money in** and **money out** across the properties you manage (house, land, vehicle, business)—built for clear totals, history, charts, paper reconciliation, printable reports and an optional PIN. Data stays in the browser (IndexedDB).

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

Pushes to `main` build on Cloudflare Pages (`npm run build`, output `dist`).

Manual deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=expendimonth --branch=main
```

SPA routing uses `public/_redirects` (`/* → /index.html`).
