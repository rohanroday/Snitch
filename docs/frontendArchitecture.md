# HUSH — Frontend Architecture

> A single-page application (SPA) for **HUSH**, an apparel e-commerce marketplace with two experiences on one codebase: a **buyer storefront** and a **seller console**.
> This document explains *what* the app is made of, *how* the pieces talk to each other, and *why* each decision was made.

**Status legend:** ✅ built · 🚧 in progress · 📋 planned
*(Everything below starts as 📋. Update the status column as each piece lands, so this file always matches the running app.)*

---

## 1. What the app does

| Experience | Who | What they can do |
|---|---|---|
| **Storefront** | Visitors and buyers (`role: user`) | Browse published products, view details, pick size/quantity, manage a server-side cart, check out with an address, view and cancel orders |
| **Seller console** | Sellers (`role: seller`) | Create and edit products (multipart, up to 5 images), manage per-size stock, publish/unpublish, delete images, fulfil orders |

The backend is a separate REST API (Node · Express 5 · MongoDB · JWT · ImageKit). The frontend never talks to ImageKit directly and never holds any secret.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast dev server, simple SPA output, env-based config |
| UI library | **React** + **TypeScript** | Component model; the API models (Product, Order, Cart…) are typed once and reused everywhere |
| Routing | **React Router** (data router, lazy routes) | Nested layouts, route guards, `?page=` and `?redirect=` handled through the URL |
| Styling | **Tailwind CSS v4** | CSS-first config: design tokens live in `@theme` inside CSS (no `tailwind.config.js`), loaded via the `@tailwindcss/vite` plugin |
| Animation | **Framer Motion** | Page transitions, scroll reveals, cart/drawer motion, layout animations; shared variants keep motion consistent |
| Icons | **lucide-react** (primary) + **react-icons** (brand logos only) | Lucide for UI icons; react-icons for social/brand marks Lucide doesn't ship |
| Server state | **TanStack Query** | Caching, refetch after mutations, optimistic updates with rollback, retry for idempotent GETs |
| Client state | **Zustand** (tiny stores) | Auth session and small UI state (drawers, toasts). Server data is *not* duplicated here |
| Forms | **React Hook Form** + **Zod** | Client validation mirrors backend rules exactly; one schema gives both validation and TS types |
| HTTP | **Axios** (single instance) | Interceptors for auth header, error normalisation, timeouts |
| Toasts / dialogs | **Sonner** + **Radix UI** primitives | Accessible focus-trapped dialogs, aria-live toasts |
| Mocking | **MSW** (Mock Service Worker) | Lets features be built while some backend endpoints are broken or missing (see §11) |
| Testing | **Vitest** + **Testing Library** + **Playwright** | Unit (adapters, validators), component, and end-to-end flows |

---

## 3. Screen inventory — 17 screens

Four layouts wrap these screens: **Storefront**, **Auth**, **Seller**, **Minimal** (system pages).

### 3.1 Public storefront — `StorefrontLayout`

| # | Screen | Route | Access | Notes |
|---|---|---|---|---|
| S1 | **Landing / Home** (the HUSH brand SPA page) | `/` | Public | Long, animated, multi-section page. Built **first** (see §12) |
| S2 | Product listing | `/products` | Public | Paginated grid, 20 per page, page kept in `?page=` |
| S3 | Product detail | `/products/:id` | Public | Gallery, size chips, quantity stepper, add to cart |

### 3.2 Authentication — `AuthLayout`

| # | Screen | Route | Access |
|---|---|---|---|
| S4 | Login | `/login` | Guest only |
| S5 | Register | `/register` | Guest only (optional seller toggle behind a feature flag) |

### 3.3 Buyer area — `StorefrontLayout` + `RequireAuth`

| # | Screen | Route | Notes |
|---|---|---|---|
| S6 | Cart | `/cart` | Line items, qty stepper, per-line warnings, totals, empty state |
| S7 | Checkout | `/checkout` | Order review + address form + place order |
| S8 | My orders | `/orders` | Order cards, status badges, cancel action |
| S9 | Order detail / confirmation | `/orders/:id` | Status timeline, items, address, total. Also the post-checkout confirmation |
| S10 | Account | `/account` | Read-only profile card + logout |

### 3.4 Seller console — `SellerLayout` + `RequireSeller`

| # | Screen | Route | Notes |
|---|---|---|---|
| S11 | My products | `/seller/products` | Table (cards on mobile), 5 per page, publish switch |
| S12 | Create product | `/seller/products/new` | Multipart form, image drop zone, tag input, size/stock grid |
| S13 | Edit product | `/seller/products/:id/edit` | Pre-filled form, sends only changed fields, image manager |
| S14 | Seller orders | `/seller/orders` | Order table + status actions (feature-flagged) |

### 3.5 System pages — `MinimalLayout`

| # | Screen | Route |
|---|---|---|
| S15 | Not found | `*` |
| S16 | Forbidden | `/403` |
| S17 | Error / offline | `/error` and the global error boundary |

### 3.6 Global UI (not screens, used everywhere)

Header (logo, nav, cart badge, account menu) · Footer · Seller sidebar · Toast region · Confirm dialog · Top loading bar · Error boundary · Splash/skeleton shown while the session is restored.

### 3.7 Delivery order (which screens first)

| Priority | Screens |
|---|---|
| **P0** | S1, S2, S3, S4, S5, S6, S7, S8, S10 (order cancel lives in S8/S9), S11, S12, S13, S15–S17 |
| **P1** | S9 (order detail), S14 (seller orders), search/filter on S2 |
| **P2** | Account editing, reorder, analytics |

---

## 4. High-level architecture

The app is organised in **layers**. A layer may only call the layer directly below it. This keeps UI code free of HTTP details and makes the backend easy to swap or mock.

```
┌──────────────────────────────────────────────────────────┐
│  Pages / Components   (React, Tailwind, Framer Motion)   │  what the user sees
├──────────────────────────────────────────────────────────┤
│  Feature hooks        (TanStack Query, RHF + Zod)        │  useProducts(), useAddToCart()
├──────────────────────────────────────────────────────────┤
│  Services             (one function per endpoint)        │  productService.list(page)
├──────────────────────────────────────────────────────────┤
│  API client + Adapters (Axios, normalisers, ApiError)    │  one shape for every response
├──────────────────────────────────────────────────────────┤
│  Network              real backend  ⇄  MSW mock handlers │  switched by VITE_USE_MOCKS
└──────────────────────────────────────────────────────────┘
```

### 4.1 Life of a request (example: "Add to cart")

1. The user clicks **Add to cart** on S3.
2. The component calls `useAddToCart()` (a TanStack Query mutation in `features/cart/hooks`).
3. The hook calls `cartService.add(productId, { size, quantity })`.
4. The service uses the shared `apiClient`. An interceptor attaches `Authorization: Bearer <token>`.
5. The response goes through the **adapter**, which converts it to the app's internal shape or throws a normalised `ApiError`.
6. On success the hook invalidates the `['cart']` query, so the header badge and cart page refetch. A toast confirms.
7. On error the message is shown, and the optimistic update (if any) rolls back.

---

## 5. Folder structure

Feature-based. Each feature owns its pages, components, hooks, services, schemas and types. Shared code lives in `components/`, `lib/` and `config/`.

```
hush-web/
├─ public/                       static assets (favicon, og image)
├─ src/
│  ├─ main.tsx                   entry: mounts <App/>, starts MSW when enabled
│  ├─ app/
│  │  ├─ App.tsx                 root component
│  │  ├─ providers.tsx           QueryClientProvider, Toaster, MotionConfig
│  │  ├─ router.tsx              route table, lazy routes, guards
│  │  └─ guards/                 GuestOnly, RequireAuth, RequireSeller
│  │
│  ├─ features/
│  │  ├─ landing/                S1
│  │  │  ├─ pages/               HomePage.tsx
│  │  │  └─ sections/            Hero, Marquee, FeaturedDrops, Collections,
│  │  │                          BrandStory, Lookbook, Values, Newsletter
│  │  ├─ auth/                   S4, S5
│  │  │  ├─ pages/ components/ hooks/ services/ schemas/ store/ types.ts
│  │  ├─ catalog/                S2, S3
│  │  │  ├─ pages/ components/   ProductCard, ProductGrid, Gallery, SizePicker…
│  │  │  └─ hooks/ services/ types.ts
│  │  ├─ cart/                   S6
│  │  ├─ checkout/               S7
│  │  ├─ orders/                 S8, S9
│  │  ├─ account/                S10
│  │  └─ seller/                 S11–S14 (lazy-loaded chunk)
│  │     ├─ pages/ components/   ProductTable, ProductForm, ImageDropzone, ImageManager…
│  │     └─ hooks/ services/ schemas/
│  │
│  ├─ components/
│  │  ├─ ui/                     Button, Input, Select, Badge, Skeleton, Modal, Tabs, Pagination…
│  │  ├─ layout/                 StorefrontLayout, AuthLayout, SellerLayout, MinimalLayout,
│  │  │                          Header, Footer, SellerSidebar
│  │  ├─ feedback/               ErrorBoundary, EmptyState, ErrorState, ConfirmDialog, TopLoader
│  │  └─ motion/                 Reveal, PageTransition, Stagger (shared Framer Motion wrappers)
│  │
│  ├─ lib/
│  │  ├─ api/
│  │  │  ├─ client.ts            Axios instance, interceptors, timeouts
│  │  │  ├─ adapters.ts          normalise product/cart/order/user shapes
│  │  │  ├─ errors.ts            ApiError + safe parsing of non-JSON responses
│  │  │  └─ query-keys.ts        central query key factory
│  │  ├─ format.ts               currency (Intl.NumberFormat en-IN), dates
│  │  ├─ image.ts                ImageKit URL helper (?tr=w-400,q-80)
│  │  ├─ motion.ts               shared variants, easings, durations
│  │  └─ utils.ts                cn(), sleep, clamp…
│  │
│  ├─ config/
│  │  ├─ brand.ts                HUSH name, tagline, nav links, social links (one place to rebrand)
│  │  ├─ constants.ts            SIZES, CURRENCIES, ROLES, ORDER_STATUSES, LIMITS
│  │  └─ env.ts                  typed access to import.meta.env
│  │
│  ├─ mocks/                     MSW handlers + fixtures for blocked endpoints
│  │  ├─ browser.ts
│  │  └─ handlers/               orders, product-by-id, seller-products, cart-remove
│  │
│  ├─ styles/
│  │  └─ index.css               @import "tailwindcss"; @theme { tokens }; base styles
│  └─ types/                     shared TS models (User, Product, Cart, Order, ApiError)
│
├─ e2e/                          Playwright specs
├─ .env.example
├─ vite.config.ts                @tailwindcss/vite plugin, /api dev proxy
└─ ARCHITECTURE.md               this file
```

**Rules that keep it scalable**

- A feature never imports from another feature's internals. Cross-feature needs go through `lib/` or a feature's public `index.ts`.
- Pages stay thin: they compose components and hooks, no fetch logic.
- Anything used by two or more features moves to `components/` or `lib/`.
- Route components are lazy-loaded; the seller console is a separate chunk so buyers never download it.

---

## 6. Routing and access control

```
StorefrontLayout
 ├─ /                     Landing
 ├─ /products             Listing
 ├─ /products/:id         Detail
 ├─ RequireAuth
 │   ├─ /cart   /checkout   /orders   /orders/:id   /account
AuthLayout  (GuestOnly)
 ├─ /login   /register
SellerLayout  (RequireAuth → RequireSeller)
 ├─ /seller → redirects to /seller/products
 ├─ /seller/products   /seller/products/new   /seller/products/:id/edit   /seller/orders
MinimalLayout
 └─ /403   /error   *  (404)
```

| Guard | Rule | Redirect |
|---|---|---|
| `GuestOnly` | Already signed in | `/` for buyers, `/seller/products` for sellers |
| `RequireAuth` | No valid session | `/login?redirect=<path>` |
| `RequireSeller` | `role !== 'seller'` | `/403` |

- The `?redirect=` value is only honoured if it is a same-origin relative path (prevents open-redirect abuse).
- Guards are a convenience. The backend is the real authority, and 403 responses are still handled in the UI.

---

## 7. State management — who owns what

| Kind of state | Owner | Examples |
|---|---|---|
| **Server state** | TanStack Query | products, cart, orders, seller products |
| **Session** | Zustand `authStore` | token, `{ id, name, email, role }`, `status: loading \| authed \| guest` |
| **UI state** | Zustand `uiStore` or local `useState` | mobile menu, filter drawer |
| **Form state** | React Hook Form | every form; validated by Zod |
| **URL state** | React Router | page number, redirect target |

Rule of thumb: **if the server owns it, don't copy it into a store.** The cart badge is derived from the cached cart query, not stored separately.

### 7.1 Auth/session flow

1. Token is stored in `localStorage` under `hush_token` (the backend uses a bearer JWT with no cookies and no refresh token).
2. On app start, if a token exists the app calls `GET /api/auth/me` while showing a splash. Success hydrates the user; failure clears the token.
3. Login/register responses don't include `role`, so the app always calls `/me` afterwards and routes by role (seller → `/seller/products`).
4. The backend reports auth failures as HTTP **400** (not 401) with the message "Error authenticating user". The API client detects that pair, clears the session, redirects to `/login?redirect=…` and shows a single (debounced) toast.
5. Logout is client-only: delete token, clear the query cache, redirect to `/`.

Because the token lives in `localStorage`, XSS is the main risk. Mitigations: no `dangerouslySetInnerHTML`, sanitised rendering, a strict CSP, and no token logging.

---

## 8. API layer

### 8.1 Rules

- **One** Axios instance. Base path `/api`. Timeout 30 s (uploads 120 s). Idempotent GETs retry twice with backoff.
- JSON numbers stay numbers (cart `quantity: 2`, never `"2"`; the backend adds them and would string-concatenate otherwise).
- Product create/update use `multipart/form-data`: text fields plain, `price`, `category`, `sizes` as `JSON.stringify(...)`, files under the field name `images`. The `Content-Type` header is left to the browser so the boundary is set correctly.
- `DELETE /cart/remove/...` sends a JSON body, so the client is configured to send bodies on DELETE.

### 8.2 Adapters (why they exist)

The backend's response shapes are inconsistent: `product` vs `data.product`, `_id` vs `id`, `message` as a string in some places and an array in others, plus `errors`, `field` and `sizeError`. The adapter layer converts all of it into **one internal shape**:

- `_id` / `id` → `id`
- every success → `{ data, message }`
- every failure → `ApiError { status, message, fieldErrors?, errors?, sizeError?, raw? }`

The UI never sees raw backend shapes, so when the backend is fixed only `adapters.ts` changes.

### 8.3 Error strategy

| Situation | Handling |
|---|---|
| Validation error | Mapped to form fields by keyword ("Name", "Email", "Password"); fallback is a form-level list |
| Auth failure (400 + known message) | Session-invalid flow (§7.1) |
| Business rule (stock, empty cart…) | Toast, or inline on the affected cart line |
| Load failure | Full-section error state with **Retry** |
| 5xx / network / non-JSON body | Generic "Something went wrong. Please try again." — raw server text is never shown in production |

---

## 9. Forms and validation

Zod schemas mirror the backend rules, so bad input is blocked before any request.

| Field | Rule |
|---|---|
| Name | 3–20 characters, trimmed |
| Email | Valid format; trimmed and lower-cased before sending |
| Password | 6 or more characters |
| Product title | 3–20 (live counter) |
| Description | 10–200 (live counter) |
| Price | 0–1,000,000, currency `INR` or `USD` |
| Category tags | Each 3–20 characters, de-duplicated case-insensitively |
| Sizes | `XS…XXL`, integer stock ≥ 0, no duplicates, at least one |
| Images | 1–5 files, jpeg/png/webp, recommended ≤ 5 MB each |
| Address | state, city, street, house, ZIP all required and trimmed |

Extra form behaviour: validate on blur and on submit, disable submit while pending (prevents double orders and double uploads), and warn on unsaved changes in the seller forms.

---

## 10. Design system and motion

### 10.1 Tailwind v4 tokens
All brand tokens are declared once in CSS:

```css
@import "tailwindcss";

@theme {
  --color-ink:    /* text / primary dark */;
  --color-paper:  /* background */;
  --color-accent: /* brand accent */;
  --font-display: /* headline font */;
  --font-sans:    /* body font */;
  --ease-hush:    cubic-bezier(0.22, 1, 0.36, 1);
}
```

Exact colours and fonts are decided once the visual inspiration is chosen. Every colour, font and easing comes from these tokens, so a re-skin is a one-file change. The brand name and copy live in `config/brand.ts`.

### 10.2 Motion conventions (Framer Motion)
- Shared variants and durations live in `lib/motion.ts`; components import them instead of inventing values.
- Reusable wrappers in `components/motion/`: `Reveal` (scroll-in), `Stagger` (children in sequence), `PageTransition` (route changes).
- `MotionConfig reducedMotion="user"` at the app root, so users who prefer reduced motion get minimal animation.
- Animate `transform` and `opacity` only, to stay smooth on mobile.

### 10.3 Icons
`lucide-react` for all UI icons (cart, search, user, menu…). `react-icons` is used only for brand marks (Instagram, X, YouTube…) that Lucide does not include. Icons are imported individually so unused ones are tree-shaken.

### 10.4 UX standards
- **Mobile-first** at 360 / 768 / 1024 / 1280. Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop. Seller tables collapse to cards on mobile.
- **Every list has** a skeleton loading state, an empty state with a call to action, and an error state with retry.
- **Prices** use `Intl.NumberFormat('en-IN', { style: 'currency', currency })` with each product's own currency.
- **Images** use a fixed 4:5 aspect ratio to avoid layout shift, lazy loading, ImageKit resize parameters, and a placeholder when a product has no images.
- **Stock UX:** sold-out sizes are disabled, "Only N left" appears at ≤ 5, and quantity is capped by stock.
- **Destructive actions** (cancel order, delete image, unpublish) always use a confirm dialog.

---

## 11. Handling backend gaps

The backend is early-stage. A full audit found several endpoints that are broken or missing, so the frontend is built to keep moving anyway.

| Area | Backend issue | Frontend approach |
|---|---|---|
| Product detail (S3) | No `GET /products/:id` | MSW mock; interim: pass product via router state / cache |
| Orders (S7–S9) | Orders router not mounted, plus several bugs | MSW mocks emulating the fixed contract |
| Cart increment / remove (S6) | Repeat-add and remove are broken | Mock + graceful error; quantity capped client-side |
| Seller product list (S11) | Always returns 500 | MSW mock |
| Seller signup | No way to create a seller | Feature flag `VITE_ENABLE_SELLER_SIGNUP`; sellers provisioned in DB |
| Seller orders (S14) | No list endpoint | Built against mock, hidden behind a flag |
| CORS | Not configured | Vite dev proxy `/api → localhost:3000`; reverse proxy or backend CORS for production |
| Mixed currencies | Backend sums raw amounts and forces INR | Client blocks checkout when a cart mixes INR and USD |

**Switching strategy:** `VITE_USE_MOCKS` toggles the MSW handlers, and each handler can be turned off individually. As a backend fix lands, that feature moves from mock to real API with no UI change, because the service and adapter layers stay the same.

---

## 12. Screen S1 — HUSH landing page (built first)

The landing page is a single, long, animated page built from independent section components. Each section is its own file under `features/landing/sections/`, so sections can be reordered, swapped or removed without touching the others.

| Section | Purpose | Data |
|---|---|---|
| Announcement bar + Header | Brand, navigation, cart badge, account menu | Auth store, cart query |
| **Hero** | Brand statement, primary call to action ("Shop now") | Static |
| Marquee / trust strip | Short brand phrases scrolling | Static |
| **Featured drops** | Real products in a grid or carousel | `GET /api/products?page=1` (with skeleton and fallback) |
| Collections | Category tiles linking into `/products` | Static now, categories endpoint later |
| Brand story | What HUSH stands for | Static |
| Lookbook | Editorial imagery | Static |
| Values / benefits | Fabric, fit, delivery, returns | Static |
| Newsletter | Email capture | UI only; no backend endpoint exists yet |
| Footer | Links, socials (react-icons) | `config/brand.ts` |

Animation on this page: scroll-triggered reveals, staggered product cards, and hover motion on cards and buttons, all through the shared motion helpers in §10.2. The final layout, palette and typography will follow the inspiration references.

---

## 13. Performance, accessibility, security

**Performance**
- Route-level code splitting; the seller console is a separate chunk. Target: initial JS ≤ 200 KB gzip on public routes.
- Listing data cached with `staleTime` around 60 s; images lazy-loaded and resized through ImageKit parameters.
- Lighthouse Performance target ≥ 85 on mobile.

**Accessibility (WCAG 2.1 AA)**
- Fully keyboard-operable flows, visible focus, labelled inputs, focus trap in dialogs, `aria-live` for toasts and errors.
- Status badges never rely on colour alone (icon + text).

**Security**
- No secrets in the bundle (the ImageKit private key and JWT secret stay server-side).
- Redirect targets validated, rendered text sanitised, tokens never logged, HTTPS only in production.

---

## 14. Testing strategy

| Level | Tool | What is covered |
|---|---|---|
| Unit | Vitest | Adapters, Zod schemas, formatters, ImageKit helper |
| Component | Testing Library | ProductCard, SizePicker, forms, cart line warnings |
| End-to-end | Playwright | Register → browse → add to cart → checkout → cancel; seller create → publish → edit → delete image |
| Contract | Vitest + MSW | Same tests run against mock and real API to catch drift |

**Definition of done (per feature):** matches the documented contract, has tests, passes an accessibility check, works at 360/768/1280, has loading/empty/error states, works with mocks and the real backend, and produces no console errors.

---

## 15. Configuration

```
VITE_API_BASE_URL=http://localhost:3000     # API origin (dev uses the /api proxy)
VITE_USE_MOCKS=true                         # enable MSW handlers for blocked endpoints
VITE_ENABLE_SELLER_SIGNUP=false             # feature flag for seller registration
```

`config/env.ts` reads and validates these once; the rest of the app imports from there.

---

## 16. Build plan (4 days)

| Day | Focus | Screens |
|---|---|---|
| **1** | Project scaffold, Tailwind v4 tokens, layouts, shared UI kit, motion helpers, `config/brand.ts`, **HUSH landing page** | S1 (+ layouts, header, footer) |
| **2** | API client, adapters, MSW, auth store, route guards, catalogue | S2, S3, S4, S5, S15–S17 |
| **3** | Cart, checkout, orders | S6, S7, S8, S9, S10 |
| **4** | Seller console, polish, tests, deploy config | S11, S12, S13 (S14 stretch) |

---

## 17. Key design decisions (talking points)

1. **Layered architecture (UI → hooks → services → client/adapters).** UI code never sees HTTP or raw backend shapes, so backend changes stay contained in one layer.
2. **Adapter layer for an inconsistent API.** The backend returns `_id` or `id`, string or array messages, and several error formats. Normalising at the boundary gives the UI one predictable contract.
3. **TanStack Query for server state, Zustand only for session/UI.** Avoids duplicating server data in client stores and gives caching, optimistic updates and rollback for free.
4. **Feature-based folders.** Each feature is self-contained, so the codebase scales by adding folders rather than growing shared files.
5. **MSW + feature flags to build around broken endpoints.** The frontend was not blocked by backend defects; features switch from mock to real one at a time.
6. **Tailwind v4 design tokens in CSS.** Rebranding is a token change; brand text and links live in one config file.
7. **Zod schemas mirroring backend validation.** Invalid input is stopped early, and the same schema provides TypeScript types.
8. **Defence in depth on access control.** UI route guards for experience, backend enforcement for security, and graceful 403 handling.
9. **Performance by design.** Lazy route chunks, a separate seller bundle, lazy images with reserved aspect ratios, and animation limited to transform/opacity.
10. **Known trade-off:** the JWT is in `localStorage` because the backend issues no cookies. XSS hardening (CSP, no raw HTML rendering) is the mitigation, and httpOnly cookies would be the recommended backend change.

---

## 18. Open decisions

| # | Decision | Default assumed |
|---|---|---|
| 1 | Brand look (palette, fonts, logo, tone) | Neutral placeholder tokens until inspiration is chosen |
| 2 | Seller signup path | Feature-flagged toggle; sellers created directly in the database |
| 3 | Payment in v1 | Text only: "Pay on delivery" |
| 4 | Mixed-currency carts | Block checkout and ask the user to fix the cart |
| 5 | Search, filters and sorting | Later phase (needs backend support) |
| 6 | SEO for product pages | Vite SPA now; consider a framework with server rendering if organic search becomes important |