# 🪔 Ganga Aarti Booking — Wedding Services Marketplace

Wedding-planner-style marketplace for Varanasi & UP (India). Hero service:
**Ganga Aarti performed at weddings**, plus everything else a wedding needs —
Pandit Ji, Gaadi (cars), Tent & Decoration, DJ & Sound, Catering,
Photography & Video, and Band Baja.

Three roles:

| Role | What they can do |
|---|---|
| **User** (customer) | Request free **quotations**, compare partner rates, accept a quote to create a **booking**, track booking status, manage profile/password |
| **Partner** (vendor) | Add/edit/delete their own **products**, reply to quotation requests in their categories with a price, see bookings and **earnings after commission** |
| **Admin** | Dashboard totals (users, partners, products, bookings, revenue, commission earned), booking status control, all quotations/users/products moderation, and **commission settings** — default %, per-category %, and per-partner % (partner > category > default; applied live in partner earnings and admin totals) |

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # production build + SEO prerender → dist/
npm run preview    # preview the production build
```

## Demo mode vs Supabase mode

**Demo mode (default):** if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
are not set, the app runs fully on the browser's `localStorage` — every
feature works out of the box. It is seeded with demo partners, 16 sample
products across all 8 categories, one quotation and one booking.

Demo logins (password `demo123` for all):

| Account | Email |
|---|---|
| Partner — Kashi Aarti Samiti | `partner@demo.in` |
| Partner — Sharma Wedding Events | `sharma@demo.in` |
| Partner — Banaras Rides & Decor | `rides@demo.in` |
| User — Demo Grahak | `user@demo.in` |

**First-account rule:** the *first* account registered through the Sign Up
form becomes **Admin** (seeded demo accounts don't count). Register your own
account first, then use it to open the Admin Panel.

**Supabase mode:** create a Supabase project, run `supabase/schema.sql` in
the SQL editor (creates `profiles`, `categories`, `products`, `quotations`,
`quotation_replies`, `bookings`, `commission_settings`, `enquiries` + starter
RLS policies), then set the env vars below and rebuild. Auth switches to
Supabase Auth; the same first-account-becomes-admin rule applies (based on
the profiles row count).

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (empty = demo mode) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (empty = demo mode) |
| `VITE_GSC_VERIFICATION` | Google Search Console verification code — when set, the app renders `<meta name="google-site-verification" content="…">` (see `src/main.jsx`) and the prerender script adds it to every static page |
| `VITE_SITE_ORIGIN` | Public origin used for canonical URLs, Open Graph, sitemap.xml and robots.txt (default `https://ganga-aarti-wedding.vercel.app`) |

## SEO

- Per-route `<title>`, meta description, Open Graph/Twitter tags and
  canonical URL (runtime via `src/components/Seo.jsx`, static via prerender).
- JSON-LD: **LocalBusiness** (home/contact), **Service + FAQPage +
  BreadcrumbList** (each category landing page), **FAQPage** (/faq).
- `npm run build` runs `scripts/prerender-seo.mjs` after Vite: it writes a
  content-rich static `index.html` for all 17 public routes (home, services,
  one landing page per category, packages, gallery, about, FAQ, contact,
  login, signup) plus `dist/sitemap.xml` and `dist/robots.txt`.
- **Google Search Console:** add the property in Search Console, choose the
  "HTML tag" method, copy the `content` value into `VITE_GSC_VERIFICATION`,
  rebuild/redeploy, then click Verify. Afterwards submit `sitemap.xml`.

## Deployment (GitHub + Vercel)

1. Push this folder to a new GitHub repository.
2. In Vercel: **New Project → Import** the repo. Framework preset: **Vite**,
   build command `npm run build`, output directory `dist` (auto-detected).
3. Add the environment variables above in Vercel → Project → Settings →
   Environment Variables (at minimum `VITE_SITE_ORIGIN` set to your real
   domain, and the Supabase pair when going live with a database).
4. Deploy. `vercel.json` already rewrites the app routes (`/login`,
   `/dashboard/*`, `/partner/*`, `/admin/*`) to the SPA while prerendered
   SEO pages are served as static files.
5. Point your custom domain in Vercel → Domains, update `VITE_SITE_ORIGIN`,
   redeploy, and verify the site in Google Search Console.

## Project structure

```
index.html                  App shell + base SEO meta + LocalBusiness JSON-LD
public/images/              Generated site photography (aarti, couple, tent, car, DJ, pandit)
scripts/prerender-seo.mjs   Static SEO pages + sitemap.xml + robots.txt
supabase/schema.sql         Database schema + RLS starter policies
src/
  data/catalog.js           Categories, packages, FAQs, testimonials, pricing
  lib/supabase.js           Supabase client (null in demo mode)
  lib/store.js              Data layer — same async API for demo & Supabase modes
  context/AuthContext.jsx   Session handling
  components/               Layout (header/footer), Seo helper
  pages/Public.jsx          Home, Services, category pages, Packages, Gallery, About, FAQ, Contact
  pages/Auth.jsx            Login / Sign up (role choice; first account = admin)
  pages/UserPanel.jsx       Quotations → accept → bookings, profile, password
  pages/PartnerPanel.jsx    Products CRUD, quotation replies, bookings & earnings
  pages/AdminPanel.jsx      Totals, bookings, quotations, users, products, commissions
```
