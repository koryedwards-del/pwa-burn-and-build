# Landing merge: Hardkor → Burn & Build

**Status:** Step 1 complete (inventory locked). **Confirm each step with Kory before edits.**

## Locked decisions

| Item | Value |
|------|--------|
| Source content | `~/code/hardkordietlandingpage/` (Hardkor landing) |
| Destination | `pwa-burn-and-build/landing/` → **burnandbuilddiet.com** |
| Brand on site | **Burn & Build** (Hardkor naming removed) |
| Product price (marketing) | **$149** |
| Checkout / CTA | `/createyourfoodplan/?browse=1` |
| Support email | support@burnandbuilddiet.com |
| Food count in copy | **278** (matches app catalog; Hardkor says 247) |
| Engine name in copy | **Burn Engine** (was “HARDKOR engine”) |
| Hardkor content | **Keeper** — layout, sections, athlete tone |
| Workflow | One step at a time; Kory confirms before each change |

## Open decisions (confirm before relevant step)

| Question | Options | Default if silent |
|----------|---------|-------------------|
| Accent color | Hardkor yellow `#FDC500` vs B&B orange `#E8671A` | Keep yellow for Step 2; revisit later |
| Affiliates page | Port `affiliates.html` or skip v1 | Ask Kory at Step 6 |
| thehardkordiet.com | Redirect to B&B or leave separate | Redirect at Step 8 |
| Root `index.html` | Replace with landing copy or redirect | Align with landing at Step 7 |

## Source inventory (Hardkor repo)

| File | Role | Merge action |
|------|------|----------------|
| `index.html` | Home — hero, calculator, philosophy, deliverables, who-it’s-for, testimonials, pricing | **Replace** `landing/index.html` (Step 2+) |
| `hardkor.css` | Shared design system (nav, footer, typography, yellow tokens) | **Copy** to `landing/hardkor.css` (Step 2) |
| `support.html` | FAQ + refund + contact | Rebrand + merge B&B app steps (Step 4) |
| `privacy.html` | Short privacy policy | Rebrand shell; prefer B&B `privacypolicy.html` body (Step 5) |
| `affiliates.html` | Waitlist affiliate program | Optional port (Step 6) |

## Destination inventory (B&B `landing/` today)

| File | Role | Merge action |
|------|------|----------------|
| `index.html` | Old B&B home (480px, orange, soft hero) | **Replaced** by Hardkor-based home |
| `support.html` | Contact + app how-to | Merge into new support (Step 4) |
| `privacypolicy.html` | Full privacy legal | Keep body; Hardkor shell optional (Step 5) |
| `js/calculator.js` + `js/previewCalculator.js` | What's Possible calculator | Prefer over Hardkor inline JS (Step 3 optional) |
| `images/BBclearlogo.png` | Logo | Use in hero (Step 2) |
| `CNAME` | burnandbuilddiet.com | **No change** |
| Favicons | B&B icons | **Keep** |

## Rebrand find/replace matrix

Apply on each ported file:

| Find | Replace with |
|------|----------------|
| The HARDKOR Diet | Burn & Build |
| HARDKOR Diet | Burn & Build |
| HARDKOR engine | Burn Engine |
| HARDKOR is different | Burn & Build is different |
| HARDKOR was built | Burn & Build was built |
| HARDKOR works | Burn & Build works |
| HARDKOR gets | Burn & Build gets |
| wordmark `HARDKOR` | B&B logo or “Burn & Build” |
| `$249` | `$149` |
| `247` (foods) | `278` |
| thehardkordiet.com | burnandbuilddiet.com |
| support@thehardkordiet.com | support@burnandbuilddiet.com |
| privacy.html | privacypolicy.html (B&B path) |

## B&B-only behaviors to preserve

From current `landing/index.html`:

- PWA standalone redirect to `/myplan/` (script in `<head>`)
- Favicon links
- Link to creator: `/createyourfoodplan/?browse=1`
- GitHub Pages deploy via `scripts/build-pages.sh` + `.github/workflows/deploy-landing.yml`

## Hardkor-only gaps to fix when merging home

- Pricing section has **no buy button** today → add **Create Your Diet →**
- Calculator is **inline JS** in Hardkor → optionally wire `previewCalculator.js` (same math)
- Nav links: Hardkor uses `#pricing`; add explicit CTA

## Step checklist

| Step | Description | Status |
|------|-------------|--------|
| **1** | Inventory + locked decisions (this doc) | ✅ Done |
| **2** | Port `index.html` + `hardkor.css`; rebrand; $149; logo; CTA; PWA script | ✅ Done |
| **3** | Wire calculator to `previewCalculator.js` (optional cleanup) | ⬜ |
| **4** | Support: Hardkor FAQs + B&B app steps + rebrand | ⬜ |
| **5** | Privacy: B&B legal content + Hardkor/B&B shell | ⬜ |
| **6** | Affiliates page (if yes) | ⬜ |
| **7** | Root `index.html` + `build-pages.sh` if new files | ⬜ |
| **8** | thehardkordiet.com redirect; archive Hardkor repo note | ⬜ |
| **9** | Deploy + smoke test live site | ⬜ |

## Not in scope

- Creator app (`createyourfoodplan/`), myplan UI, server, Stripe config (already $149 unless env differs)
- Coach Kory / competition stack hero (can add later)
- Hardkor yellow → orange retheme (unless Kory asks)

## Reference paths

- Hardkor source: `/Users/koryedwards/code/hardkordietlandingpage/`
- B&B landing: `/Users/koryedwards/code/pwa-burn-and-build/landing/`
- Deploy output: `_site/` via `scripts/build-pages.sh`
