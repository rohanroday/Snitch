# Snitch — Frontend Product Requirements Document (PRD)

|  |  |
| --- | --- |
| **Product** | Snitch (apparel e-commerce marketplace, buyers + sellers) |
| **Document** | Frontend PRD v1.0 |
| **Date** | 21 Sep 2026 |
| **Source of truth** | Reverse-engineered from the `server/` backend (Node.js · Express 5 · MongoDB/Mongoose 9 · JWT · ImageKit · Multer) |
| **Status** | Draft for review |

**Legend used throughout** 🟢 works · 🟡 works with caveats · 🔴 broken in current code · ⚫ missing / not mounted **P0** = must have for MVP · **P1** = should have · **P2** = later

---

## 1. Executive summary

The backend is an early-stage REST API for a clothing marketplace. It supports **registration/login (JWT)**, **product catalogue with multi-image upload**, **seller product management**, a **server-side cart**, and **orders**. The frontend must deliver two experiences on one app:

1. **Storefront (buyer):** browse published products, view product details, pick size/quantity, manage cart, check out with an address, view/cancel orders.
2. **Seller console:** create/edit products (multipart with up to 5 images), manage per-size stock, publish/unpublish, delete images.

**Critical finding:** several backend paths are broken or missing today (see §5 and §14). Most importantly: the **orders router is not mounted**, the **seller product list crashes**, **cart increment/remove are broken**, there is **no "get product by id" endpoint**, and there is **no way to create a seller account**. This PRD therefore specifies (a) the intended frontend behaviour, (b) the exact backend contract it depends on, and (c) which features are **blocked** until backend fixes land. The frontend should be built against an API adapter layer + mock server so it is not blocked (see §6.6).

---

## 2. Product context

- **Brand / project name:** Snitch (from `docs.md`: "this is rohan and i am making project named snitch").
- **Domain (inferred):** apparel — sizes `XS, S, M, L, XL, XXL`; per-size stock; categories are free-text tags.
- **Currencies:** `INR` (default) and `USD` per product. Orders are hard-coded to `INR` server-side.
- **Images:** hosted on ImageKit (folder `/snitch`); the frontend only receives URLs. Uploads always go **through the backend** (never directly to ImageKit; the private key must never be in the frontend).
- **Payments:** none implemented. An order is created immediately with status `PLACED` (implicitly cash-on-delivery / pay-later).

### 2.1 Goals

| # | Goal |
| --- | --- |
| G1 | Let any visitor browse published products quickly on mobile and desktop. |
| G2 | Let a buyer register/login, build a cart, and place an order in ≤ 4 steps. |
| G3 | Let a seller manage their catalogue (create, edit, stock, images, publish) without developer help. |
| G4 | Present backend errors in clear, human language and never expose raw stack traces/HTML. |
| G5 | Be resilient to the current backend quirks via an adapter layer, so backend fixes do not require UI rewrites. |

### 2.2 Non-goals (v1)

Payment gateway, reviews/ratings, wishlist, coupons, product variants beyond size, shipping-rate calculation, admin panel, multi-language, native mobile apps, guest cart (server cart requires auth), real-time notifications.

---

## 3. Users & roles

Roles come from the backend `role` enum: **`user`** (default) and **`seller`**. Role is embedded in the JWT (`{ id, role }`) and returned by `GET /api/auth/me`.

| Persona | Role | Can do (per backend) |
| --- | --- | --- |
| **Visitor** | none | Browse published products (`GET /api/products`). |
| **Buyer** | `user` | Everything a visitor can + cart, create order, list own orders, cancel own order. |
| **Seller** | `seller` | Create/update/publish products, delete product images, list *own* products, update order status (any order by id). Backend does **not** restrict sellers from using cart/orders. |

> ⚠️ **No signup path for sellers.** `POST /api/auth/register` only accepts `name, email, password`; role is always `user`. Seller accounts currently can only be created by editing the DB. See **BG-07** and Open Question **Q1**. The UI must include a feature-flagged "Sell on Snitch / Register as seller" entry point.

---

## 4. Scope summary

| Area | Status | Priority |
| --- | --- | --- |
| Auth: register, login, session restore, logout | 🟢 backend OK | P0 |
| Product listing (paginated, 20/page) | 🟡 | P0 |
| Product detail page | ⚫ no `GET /products/:id` | P0 (blocked → BG-01) |
| Cart: view | 🟢 | P0 |
| Cart: add | 🟡 first add works, adding same item again 🔴 | P0 |
| Cart: decrement/remove | 🔴 | P0 |
| Checkout / create order | ⚫ router not mounted + multiple bugs | P0 |
| My orders list | ⚫ + 🔴 sort bug | P0 |
| Cancel order | ⚫ (logic OK once mounted) | P0 |
| Order detail | ⚫ no `GET /orders/:id` | P1 |
| Seller: create product | 🟡 | P0 |
| Seller: edit product / add images | 🟡 | P0 |
| Seller: publish toggle | 🟢 | P0 |
| Seller: delete image | 🟡 | P0 |
| Seller: my products list (5/page) | 🔴 always 500 | P0 (blocked → BD-13) |
| Seller: order management | ⚫ no list endpoint; status update partial | P1 |
| Search / filter / sort | ⚫ | P1 |
| Account/profile, address book | ⚫ | P2 |

---

## 5. Backend audit — what exists today

### 5.1 Stack & runtime

- Node ESM (`"type": "module"`), Express **5.2**, Mongoose **9.10**, `jsonwebtoken`, `bcrypt`(10 rounds), `express-validator`, `multer` (memory storage), `@imagekit/nodejs`, `morgan('dev')`, `dotenv`.
- Server listens on **port 3000** (hard-coded). DB via `MONGODB_URI`. Env keys: `MONGODB_URI`, `IMAGEKIT_API_KEY` (private key), `JWT_SECRET`.
- **No CORS middleware**, no rate limiting, no helmet, no global error handler, no 404 handler.
- Body parsing: `express.json()` + Multer for multipart on product create/update.
- Mounted routers in `app.js`: `/api/auth`, `/api/products`, `/api/cart`. **`/api/orders` is NOT mounted.**

### 5.2 Endpoint inventory (as coded)

| # | Method & path | Auth | Role | Status |
| --- | --- | --- | --- | --- |
| 1 | `POST /api/auth/register` | – | – | 🟢 |
| 2 | `POST /api/auth/login` | – | – | 🟢 |
| 3 | `GET /api/auth/me` | Bearer | any | 🟢 |
| 4 | `GET /api/products?page=` | – | – | 🟡 |
| 5 | `POST /api/products/create` (multipart) | Bearer | seller | 🟡 |
| 6 | `PATCH /api/products/update/:id` (multipart) | Bearer | seller (owner) | 🟡 |
| 7 | `PATCH /api/products/publish/:id` | Bearer | seller (owner) | 🟢 |
| 8 | `DELETE /api/products/image/:id/:imageId` | Bearer | seller (owner) | 🟡 |
| 9 | `GET /api/products/seller?page=` | Bearer | seller | 🔴 |
| 10 | `POST /api/cart/add/product/:productId` | Bearer | any | 🟡 / 🔴 |
| 11 | `DELETE /api/cart/remove/product/:productid` | Bearer | any | 🔴 |
| 12 | `GET /api/cart/` | Bearer | any | 🟢 |
| 13 | `POST /api/orders/` | Bearer | any | ⚫ |
| 14 | `GET /api/orders/` | Bearer | any | ⚫ / 🔴 |
| 15 | `PATCH /api/orders/cancel/:orderId` | Bearer | owner | ⚫ |
| 16 | `PATCH /api/orders/status/:orderId` | Bearer | seller | ⚫ / 🟡 |

Full request/response contracts are in §10; the complete defect list is in §14.

---

## 6. Technical foundation for the frontend

### 6.1 Recommended stack (decision for the team; adjustable)

- **React 18 + TypeScript + Vite**, React Router 6, **TanStack Query** (server state), **React Hook Form + Zod** (forms/validation), Tailwind CSS (+ a headless UI kit such as Radix/shadcn for dialogs, toasts, tabs), Axios or `fetch` wrapper, **MSW** for mocking blocked endpoints, Vitest + Testing Library + Playwright.
- If SEO for product pages is a priority, use **Next.js (App Router)** instead of Vite (backend is a separate API either way).

### 6.2 Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | e.g. `http://localhost:3000` (dev) / production API origin. Endpoints are prefixed `/api`. |
| `VITE_ENABLE_SELLER_SIGNUP` | Feature flag for seller registration (see Q1). |
| `VITE_USE_MOCKS` | Enables MSW mocks for blocked endpoints (§6.6). |

**CORS:** backend has no CORS. In dev use a Vite proxy (`/api` → `http://localhost:3000`). In production either (a) serve frontend and API from the same origin behind a reverse proxy, or (b) backend adds CORS (BD-20). Do not ship without one of these.

### 6.3 API client rules

- All calls go through one client module. Base path `/api`.
- **Auth header:** `Authorization: Bearer <jwt>` (the middleware splits on a space; a missing/malformed header yields a 400).
- JSON requests: `Content-Type: application/json`. **Send numbers as JSON numbers** (e.g. cart `quantity: 2`, not `"2"`) — the cart controller does `existing + quantity`, which string-concatenates otherwise.
- Product create/update are **`multipart/form-data`**: text fields `title`, `description`, and **`price`, `category`, `sizes` as `JSON.stringify(...)` strings**, plus file field **`images`** (repeat up to 5 times). Do not set `Content-Type` manually (let the browser add the boundary).
- `DELETE /api/cart/remove/...` needs a JSON **body** (`size`, `quantity`) — ensure the HTTP client sends bodies on DELETE.
- **Never assume JSON error bodies:** unhandled server errors return Express's default HTML/plain text. Wrap parsing in try/catch and map to a generic "Something went wrong" message.
- **Response normalisation layer (required):** backend shapes are inconsistent (§13.2). The adapter converts everything to a single internal shape (`id` instead of `_id`/`id`, `{ data, message }`, `ApiError { status, message, fieldErrors?, raw }`).

### 6.4 Auth & session

- JWT is returned in the response **body** (`token`) — there are no cookies and no refresh token. Tokens **do not expire** (no `expiresIn`).
- Store token in `localStorage` (key `snitch_token`) — the only practical option with this backend; mitigate XSS: strict CSP, no `dangerouslySetInnerHTML`, sanitise any rendered user text.
- On app start: if a token exists → `GET /api/auth/me` (show splash/skeleton while pending). Success → hydrate `user {id,name,email,role}`. Failure → clear token, treat as logged out.
- **Auth failures are returned as HTTP 400** (not 401) with `message: "Error authenticating user"` (middleware) or `"Error fetching user"` (`/me`). The client must treat a 400 with those messages as "session invalid": clear token, redirect to `/login?redirect=<current>`, toast "Please sign in again."
- Logout is client-only (delete token, clear TanStack cache, redirect to `/`).
- Register/login responses **omit `role`** → after login always call `/me` (or decode JWT payload) to obtain role before routing (seller → `/seller`, buyer → `redirect` or `/`).

### 6.5 Constants shared with backend

```
export const SIZES = ['XS','S','M','L','XL','XXL'] as const;
export const CURRENCIES = ['INR','USD'] as const;
export const ROLES = ['user','seller'] as const;
export const ORDER_STATUSES = ['PENDING','PLACED','SHIPPED','DELIVERED','CANCELLED'] as const;
export const LIMITS = {
  name: [3,20], title: [3,20], description: [10,200], categoryItem: [3,20],
  priceMax: 1_000_000, maxImages: 5, password: 6, listingPageSize: 20, sellerPageSize: 5,
};
```

### 6.6 Mock & adapter strategy (unblocks frontend)

Because of blocked endpoints, implement a thin `services/` layer with one function per endpoint and **MSW handlers** that emulate the *intended* (fixed) contract for: orders (all), `GET /products/:id`, `GET /products/seller`, cart remove/increment, seller orders. A `VITE_USE_MOCKS` flag switches each handler on/off so features can be turned to real backend one by one as fixes land.

---

## 7. Information architecture & routing

### 7.1 Sitemap

```
/                        Home (featured + latest products)      [public]
/products                Product listing (paginated)            [public]
/products/:id            Product detail                          [public]  (needs BG-01)
/login                   Login                                   [guest-only]
/register                Register (+ optional seller toggle)     [guest-only]
/cart                    Cart                                    [auth]
/checkout                Address + order review + place order    [auth]
/orders                  My orders                               [auth]
/orders/:id              Order detail / confirmation             [auth]  (needs BG-04; else derive from list)
/account                 Profile (read-only in v1)               [auth]
/seller                  Seller console → redirects to products  [seller]
/seller/products         My products table (5/page)              [seller]
/seller/products/new     Create product                          [seller]
/seller/products/:id/edit  Edit product + image manager          [seller]
/seller/orders           Orders to fulfil                        [seller]  (blocked → BG-05)
/403  /404  /error       Error pages
```

### 7.2 Route guards

| Guard | Rule | Redirect |
| --- | --- | --- |
| `GuestOnly` | token+user present → skip | `/` (buyer) or `/seller` (seller) |
| `RequireAuth` | no valid session | `/login?redirect=<path>` |
| `RequireSeller` | `user.role !== 'seller'` | `/403` |

- Backend is the true authority (403 for non-sellers on product endpoints) — the UI guard is convenience only; still handle 403 responses gracefully.
- After login/register honour `?redirect=` (only same-origin relative paths).

### 7.3 Global layout

- **Header:** logo, nav (Shop), search box (P1, disabled until BG-02), cart icon with **badge = Σ quantities** (auth only), account menu (Orders, Account, Seller console if seller, Logout) or Login/Register buttons.
- **Footer:** basic links, brand.
- **Seller layout:** left nav (Products, New product, Orders), top bar with "View storefront".
- Toast region, global confirm-dialog, global error boundary, top-of-page loading bar.

---

## 8. Global UX requirements

| Area | Requirement |
| --- | --- |
| **Responsive** | Mobile-first; breakpoints ~360 / 768 / 1024 / 1280. Product grid: 2 cols mobile, 3 tablet, 4 desktop. Seller tables collapse to cards on mobile. |
| **Loading** | Skeletons for grids/tables/detail; disabled + spinner on submit buttons; never block whole page for mutations. |
| **Empty states** | Every list has an illustrated empty state with a CTA (empty cart → "Continue shopping"; no orders; no seller products → "Create your first product"; no products in store). |
| **Errors** | Inline field errors for validation; toast for action failures; full-page retry for load failures; friendly text for network errors and non-JSON 5xx. |
| **Currency** | Format with `Intl.NumberFormat('en-IN', { style:'currency', currency })`; show ₹ for INR, $ for USD. Prices are numbers (major units, not paise/cents). |
| **Dates** | Order `createdAt/updatedAt` are ISO strings → display in user's locale (e.g. "21 Sep 2026, 4:30 PM"). |
| **Images** | Use `images` sorted by `order` ascending; first = primary. Provide `alt` = product title. Lazy-load; reserve aspect ratio (e.g. 4:5) to avoid layout shift. ImageKit URLs support `?tr=w-400,q-80` transformations for responsive sizes (recommended). Fallback placeholder when `images` is empty (possible after image deletion). |
| **Stock UX** | Size chip disabled + "Sold out" when `stock === 0`; "Only N left" when `stock ≤ 5` (threshold configurable); quantity capped at stock. |
| **Accessibility** | WCAG 2.1 AA: keyboard operable everything, visible focus, labelled inputs, `aria-live` for toasts/errors, colour-contrast-safe status badges (never colour-only), focus trap in dialogs, image `alt`. |
| **Performance** | LCP < 2.5 s on 4G for listing; route-level code splitting; seller console lazy-loaded; TanStack Query caching (listing `staleTime` ~60 s). |
| **Confirmation** | Destructive/irreversible actions (cancel order, delete image, unpublish, remove cart item(all)) use a confirm dialog. |
| **Forms** | Validate on blur + submit, mirror backend rules (§12), trim strings, show char counters where limits are tight (title 20, description 200). Warn on unsaved changes (seller forms). |
| **Idempotency** | Disable submit while pending to avoid double orders/uploads. |
| **Security** | No secrets in frontend; sanitise output; validate redirect param; never log tokens; CSP. |
| **Analytics (P2)** | Optional events: view_product, add_to_cart, begin_checkout, purchase (order created), seller_product_created. |

---

## 9. Feature specifications

Each feature lists: route/access, purpose, API, UI, states, rules, acceptance criteria (AC).

### F1. Register — `/register` · guest-only · P0

**API:** `POST /api/auth/register` `{ name, email, password }` → `201 { message, user:{id,name,email}, token }`. **Fields & rules:** Name 3–20 chars (trimmed) · Email valid format (unique) · Password ≥ 6 chars (trimmed by server). Add "confirm password" client-side only. **UI:** form, show/hide password, link to login, optional "I want to sell" toggle (feature-flagged, Q1). **Errors:** `400 { message:"Validation failed", errors:[string,...] }` → map to a form-level list (messages are strings, not field-keyed — best-effort match by keyword: "Name", "Email", "Password"). `400 { message:"Email already exists", field:"email" }` → inline on email field. **Post-success:** store token → call `/me` → redirect. **AC:**

- Client blocks invalid input before calling API using the same limits.
- Duplicate email shows inline error on the email field.
- Successful signup logs the user in and lands on `redirect` or `/`.
- Email is trimmed (and lower-cased — see Q6) before sending.

### F2. Login — `/login` · guest-only · P0

**API:** `POST /api/auth/login` `{ email, password }` → `200 { message, user:{id,name,email}, token }`. **Rules:** email valid; password ≥ 6 (server rejects shorter with validation error — don't reveal more). **Errors:** `400 "Email or password is incorrect"` (generic; show at form level). Validation errors as in F1. **Post-success:** save token, `GET /me` to get `role`, route by role (seller → `/seller/products`; else `redirect`/`/`). **AC:**

- Wrong credentials show one generic error (no user enumeration).
- `?redirect=` respected only if relative and same-origin.
- Loading state prevents double submit.

### F3. Session bootstrap & logout — global · P0

See §6.4. **AC:**

- Refresh keeps user logged in while token is valid.
- Invalid/deleted-user token → cleared silently and user sees logged-out UI.
- Logout clears token, query cache, cart badge and redirects to `/`.
- Any API call returning 400 with `"Error authenticating user"` triggers the session-invalid flow once (debounced).

### F4. Product listing — `/` (featured section) and `/products` · public · P0

**API:** `GET /api/products?page=N` → `200 { message, data:{ products:Product[], totalPages, currentPage } }`. **Fixed page size 20**, published products only, **no sort/filter/search** (order = DB natural order). **UI:** responsive grid of `ProductCard` (primary image, title, formatted price, "Sold out" badge if every size stock is 0), pagination (prev/next + page numbers) bound to `?page=`. **Rules/edge cases:**

- Page param 1-based; clamp client-side to `[1, totalPages]`.
- If `totalPages === 0` (no published products) show empty state and **do not** request page > 0 (the backend errors on an empty catalogue — BD-14).
- Do not rely on `seller`, `imageKitId`, `__v` fields (present but not for display).
- Sorting/filters/search UI: **P1**, add when BG-02 exists (planned controls: category, size, price range, sort by newest/price, text search). **AC:**
- Grid renders skeletons then products; error state with Retry.
- URL reflects page; back/forward works; deep-link works.
- Card click navigates to `/products/:id`.
- Prices use each product's own currency.

### F5. Product detail — `/products/:id` · public · P0 (🔒 blocked by BG-01)

**API (required, not existing):** `GET /api/products/:id` (public for published; owner may view unpublished). **Interim workaround:** pass the product via router state / TanStack cache from listing; if opened via deep link without data show "Product unavailable — backend endpoint pending" (behind mock flag use MSW). **UI:**

- Gallery of up to 5 images (thumbnails + main, swipe on mobile, zoom on desktop).
- Title, price, description (≤200 chars), category tags.
- **Size selector** from `sizes[]` (`{size, stock}`); disabled if stock 0; show remaining stock hint.
- **Quantity stepper** min 1, max = stock of selected size (subtract quantity already in cart for that size when known).
- **Add to cart** button; guests → `/login?redirect=/products/:id`.
- Success toast with "View cart" action; header badge updates. **Cart call:** `POST /api/cart/add/product/:productId` body `{ size, quantity }` (numbers!). **Errors:** `404 "Product not found"`, `400 "Size not found"`, `400 "Quantity exceeds stock"`, validation `400 ["Invalid Size", "Quantity must be greater than 0", "Imvalid Product ID"]` (sic). **AC:**
- Cannot add without choosing a size (button disabled with hint).
- Sold-out sizes cannot be selected; all sold out → "Out of stock".
- Add-to-cart works for first add and for repeated add of the same product+size (repeat add is 🔴 until BD-10 fixed; mock/handle error gracefully).
- Unpublished/non-existent product shows a 404 page.

### F6. Cart — `/cart` · auth · P0

**API:**

- `GET /api/cart/` → `200 { message, data:{ cart:{ _id, userId, products:[{ _id, productId:<populated Product>, quantity, size }] }, totalPrice:number } }` (auto-creates an empty cart). `totalPrice` = Σ(amount × qty) **ignoring currency**.
- Increase: `POST /api/cart/add/product/:productId` `{ size, quantity }`.
- Decrease/remove: `DELETE /api/cart/remove/product/:productId` body `{ size, quantity }` — **decrements by `quantity`; removes the line if `quantity ≥ current`**. (Intended contract; currently 🔴 BD-11.) **No "set quantity" or "clear cart" endpoint** → stepper `+` calls add(1), `−` calls remove(1), "Remove" calls remove(currentQty). Optional P1: BG-06. **UI:** line items (image, title, size, unit price, qty stepper, line total, remove), order summary (subtotal, note "Shipping calculated at checkout — free in v1" or omit), **Proceed to checkout**, continue shopping link, empty state. **Rules:**
- A line is unique by `(productId, size)`.
- Show per-line warnings computed client-side: product `isPublished === false` ("No longer available" — checkout will fail: `"Cart has unpublished products"`), size missing, `stock < quantity` ("Only N left").
- Compute totals **per currency** client-side; if the cart mixes INR and USD, show a warning and disable checkout (backend forces INR and sums raw numbers — BD-06). Prefer computing display totals on the client rather than trusting `totalPrice` when mixed.
- Optimistic updates for qty changes with rollback on error. **AC:**
- Quantities and totals update after each action (refetch after mutation).
- Removing last item shows empty state.
- Checkout button disabled when cart empty or has invalid lines.
- Badge in header equals Σ quantity.

### F7. Checkout — `/checkout` · auth · P0 (🔒 blocked by BD-01…BD-06)

**API:** `POST /api/orders/` body `{ address:{ state, city, street, house, zip(Code) } }` → `201 { message, data:{ order } }`. **Address fields (all required, trimmed):** State, City, Street, House/Flat, ZIP/PIN. ⚠️ **Contract mismatch:** validator requires `address.zipCode`, model requires `address.zip` — until BD-03 is fixed send **both** `zip` and `zipCode` with the same value; after the fix send only the agreed key. **Flow:** review items (read-only) → address form → "Place order" → success screen `/orders/:id` (or list) with order id, status `PLACED`, total, address → cart badge resets to 0 (**refetch cart**; backend does not clear the cart today — BD-05). **Pre-flight checks (client):** cart non-empty, all products published, stock adequate, single currency. **Server errors to surface:**

- `400 "Cart is empty"`
- `400 "Cart has unpublished products"`
- `400 { message:"Cart has invalid sizes", sizeError:[{ productId, message }] }` → highlight the offending cart lines with the per-line message ("Only 2 available for size:M", "Size L not available") and offer "Fix in cart".
- Validation `400 { errors:[...] }`. **Not supported by backend (call out in UI/roadmap):** payment step, recipient name/phone, shipping method, coupon, GST/tax lines. Show "Payment: Pay on delivery" text (assumption — Q3). **AC:**
- Cannot submit with empty/invalid address.
- Double-click doesn't create two orders.
- On success user sees confirmation, cart shows empty after refetch.
- Stock errors map to specific cart lines.

### F8. My orders — `/orders` · auth · P0 (🔒 BD-01, BD-07)

**API:** `GET /api/orders/` → `200 { message, data:{ orders:Order[] } }` (intended newest first). Not paginated. **UI:** list of order cards: order id (short, copy), placed date, status badge, item thumbnails (snapshot `product.image`), item count, `totalPrice`, "View details" and **Cancel** (only when status ∈ `PLACED`/`PENDING`). **Status presentation:**

| Status | Meaning | Badge | Buyer actions |
| --- | --- | --- | --- |
| `PENDING` | in enum; never set by backend today | grey | cancel |
| `PLACED` | default on creation | blue | cancel |
| `SHIPPED` | in enum (no backend way to set it — BD-08) | amber | none (cancel rejected) |
| `DELIVERED` | set by seller | green | none |
| `CANCELLED` | set by buyer | red | none |

- Add a simple status timeline in order detail: Placed → Shipped → Delivered (cancelled shown as terminal branch). **AC:**
- Sorted newest first (sort client-side by `createdAt` desc as a safeguard).
- Empty state with CTA.
- Order snapshot shows prices as at purchase time (from order, not live product).

### F9. Order detail — `/orders/:id` · auth · P1 (🔒 BG-04)

No `GET /orders/:id`; derive from the list cache (find by `_id`). Show: id, date, status timeline, items (image, title, description, size, qty, unit price, line total), address block (`state, city, street, house, zip`), total, cancel button, "Reorder" (P2).

### F10. Cancel order — action in F8/F9 · auth · P0

**API:** `PATCH /api/orders/cancel/:orderId` (no body) → `200 { message:"Order cancelled successfully" }`. **Errors (all HTTP 400 with `message`):** "Order not found", "You are not authorized to cancel this order", "Order is already cancelled", "Order cannot be cancelled as it is already SHIPPED|DELIVERED". **UX:** confirm dialog ("This can't be undone"), optimistic status → `CANCELLED` with rollback, refetch orders after. Note: **stock is not restored server-side** (BD-09) — nothing for UI to do. **AC:** [ ] button hidden for non-cancellable statuses; [ ] server rejection message shown verbatim in toast.

### F11. Seller: my products — `/seller/products` · seller · P0 (🔒 BD-13)

**API:** `GET /api/products/seller?page=N` → `{ message, data:{ products, totalPages, currentPage } }` — **5 per page**, includes **unpublished** products. **UI:** table/cards: thumbnail, title, price, categories, sizes+stock summary (e.g. `S:4 M:0 L:12`, low/zero-stock highlight), **Published** switch, created date, actions (Edit, Publish/Unpublish). "New product" button. Pagination. **Publish toggle:** `PATCH /api/products/publish/:id` → `{ message, data:{ product:{ id, isPublished } } }` (toggle; response tells the new state). Optimistic; confirm on unpublish. Pre-check client-side before publishing: ≥1 image, ≥1 size with stock (warn, not block — backend doesn't enforce). **Errors:** `403 "Only sellers can get products"`, `403 "Only authenticated sellers can publish products"`, `404 "Product not found"`. **AC:** [ ] empty state; [ ] published state shown with badge; [ ] toggle reflects server result; [ ] non-sellers can't reach page.

### F12. Seller: create product — `/seller/products/new` · seller · P0

**API:** `POST /api/products/create` — `multipart/form-data`:

| Field | Type | Encoding |
| --- | --- | --- |
| `title` | string | plain |
| `description` | string | plain |
| `price` | `{ amount:number, currency:'INR' | 'USD' }` |
| `category` | `string[]` | `JSON.stringify` |
| `sizes` | `{ size:Size, stock:number }[]` | `JSON.stringify` |
| `images` | File ×1–5 | repeated file part |
| → `201 { message, product:{ id, title, price, description, category, sizes, images:[{url,imageKitId,order}], seller, isPublished:false } }`. |  |  |
| **Form spec:** |  |  |

- **Title** 3–20 chars (live counter `n/20`).
- **Description** 10–200 chars (live counter).
- **Price:** amount number 0–1,000,000 (validator allows ≥0; model max 1,000,000); **currency** select, default INR.
- **Categories:** tag input, each tag **3–20 chars** (model rule; validator alone only checks non-empty — BD-15), trim, de-duplicate case-insensitively. Suggest previously used categories (P1).
- **Sizes & stock:** checkbox per size XS–XXL; when checked, integer stock ≥ 0 input. **No duplicate sizes**; at least one size (UI rule; backend permits empty).
- **Images:** drag-and-drop/browse, **min 1, max 5**, image MIME only (jpeg/png/webp), recommended ≤ 5 MB each (backend has no limit), preview grid, remove before upload, drag to order (position → `order` = index+1). Show upload progress.
- Submit → progress state ("Uploading images…" — server uploads to ImageKit before saving, can take seconds).
- **After success:** product is **unpublished**; show success with "Publish now" / "Go to products". **Errors:** `403 "Only sellers can create products"`; `400 { message:[{ message:"Please upload images", field:"images" }] }` (note `message` is an array here); validation `errors[]`; 500 for malformed JSON fields / Multer errors / Mongoose validation (BD-15/16/17) → generic error toast. **AC:** [ ] cannot submit without images; [ ] limits enforced client-side; [ ] payload encoding exactly as table; [ ] double submit prevented; [ ] unsaved-change guard.

### F13. Seller: edit product — `/seller/products/:id/edit` · seller · P0

**Data source:** requires product data; use seller list cache/router state, or `GET /products/:id` when BG-01 exists (deep link otherwise unsupported). **API:** `PATCH /api/products/update/:id` multipart, **all fields optional** (send only what changed) → `200 { message, data:{ product:{ id,title,price,description,category,sizes,images,seller,isPublished } } }`. **Semantics to respect:**

- `price` is replaced wholesale → always send **both** `amount` and `currency`.
- `category` and `sizes` are **replaced entirely** → send the full arrays.
- New `images` are **appended**; server rejects if `existing + new > 5` (`400 "Max 5 images"`) → compute remaining slots client-side.
- Cannot change publish state here (use toggle). **Image manager:**
- Existing images (sorted by `order`) with delete button → `DELETE /api/products/image/:productId/:imageKitId` (the `imageId` path param is the **`imageKitId`**, not `_id`) → `200 { message:"Image deleted successfully" }`. Confirm dialog. Backend does not prevent deleting the last image or remove it from ImageKit (BD-24) → UI blocks deleting the last image of a **published** product and warns for unpublished.
- No reorder / set-primary API in v1 (BG-12) — show order as-is. **Errors:** `403 "Only sellers can update products"`, `403 "Only authenticated sellers can update products"` (not owner), `404 "Product not found"`, `400 "Max 5 images"`. **AC:** [ ] form pre-filled; [ ] only dirty fields sent; [ ] image slots limited to 5 total; [ ] update reflects in list cache immediately.

### F14. Seller: orders — `/seller/orders` · seller · P1 (🔒 BG-05)

Backend gives sellers only `PATCH /api/orders/status/:orderId` with body `{ status }`, valid effect for **`PLACED`** (only if order not CANCELLED/DELIVERED/SHIPPED) and **`DELIVERED`** (unless CANCELLED). Other statuses return `200` but change nothing (BD-08). There is **no endpoint to list orders for a seller** and orders do not store seller ids (BD-26). Frontend deliverable in v1: build UI against mock (orders table, filter by status, "Mark shipped / Delivered" actions, status change confirm) and hide the nav item behind a feature flag until BG-05 lands.

### F15. Account — `/account` · auth · P2

Read-only card: name, email, role (from `/me`). "Log out". No edit/password change (no endpoint — BG-10).

### F16. Error & edge pages · P0

- **404** for unknown routes and missing products.
- **403** for role violations.
- **Offline/network error** banner.
- **Global boundary** for unexpected UI errors (with "Reload").

---

## 10. API contract reference (as implemented, plus intended fixes)

Base: `{API_BASE}/api` · JSON unless noted · Auth = `Authorization: Bearer <token>`.

### 10.1 Auth

**POST `/auth/register`** — body `{name, email, password}`

```
201 { "message":"User registered successfully",
      "user":{"id":"…","name":"…","email":"…"}, "token":"<jwt>" }
400 { "message":"Email already exists", "field":"email" }
400 { "message":"Validation failed", "errors":["Name is required", "…"] }
```

**POST `/auth/login`** — body `{email, password}`

```
200 { "message":"User logged in successfully", "user":{"id","name","email"}, "token":"<jwt>" }
400 { "message":"Email or password is incorrect" }
```

**GET `/auth/me`** (auth)

```
200 { "message":"User fetched successfully", "user":{"id","name","email","role":"user|seller"} }
400 { "message":"Error authenticating user", "error":"jwt malformed|jwt expired|…" }
400 { "message":"Error fetching user", "error":"…" }
```

### 10.2 Products

**GET `/products?page=1`** (public)

```
200 { "message":"product feteched successfully",
      "data":{ "products":[Product], "totalPages":3, "currentPage":1 } }
```

**POST `/products/create`** (seller, multipart) — see F12 → `201 { message, product:{id,…} }` **PATCH `/products/update/:id`** (seller-owner, multipart) — see F13 → `200 { message, data:{ product } }` **PATCH `/products/publish/:id`** (seller-owner) → `200 { message:"Product published|unpublished successfully", data:{ product:{ id, isPublished } } }` **DELETE `/products/image/:id/:imageId`** (seller-owner; `imageId` = `imageKitId`) → `200 { message:"Image deleted successfully" }` **GET `/products/seller?page=1`** (seller) → `200 { message, data:{ products, totalPages, currentPage } }` (5/page) — currently 🔴. Common: `403 { message }` (wrong role / not owner), `404 { message:"Product not found" }`.

### 10.3 Cart (all require auth)

**GET `/cart/`**

```
200 { "message":"Cart data Retrived ",
      "data":{ "cart":{ "_id","userId","products":[{ "_id","productId":Product,"quantity":2,"size":"M" }] },
               "totalPrice": 3998 } }
```

**POST `/cart/add/product/:productId`** — body `{ "size":"M", "quantity":1 }` → `200 { message:"Product added to cart" }`; `404 "Product not found"`; `400 "Size not found" | "Quantity exceeds stock"`. **DELETE `/cart/remove/product/:productId`** — body `{ "size":"M", "quantity":1 }` → intended `200 { message:"Product removed  Successfully" }` (sic, double space); `404 "Product Not Found" | "Product not found in cart"`; `400 "Cart is empty"`.

### 10.4 Orders (all require auth; router currently unmounted)

**POST `/orders/`** — body `{ address:{ state, city, street, house, zip|zipCode } }`

```
201 { "message":"Order created successfully", "data":{ "order":Order } }
400 { "message":"Cart is empty" }
400 { "message":"Cart has unpublished products" }
400 { "message":"Cart has invalid sizes", "sizeError":[{ "productId":"…","message":"Only 2 available for size:M" }] }
```

**GET `/orders/`** → `200 { message:"Orders fetched successfully", data:{ orders:[Order] } }` **PATCH `/orders/cancel/:orderId`** → see F10. **PATCH `/orders/status/:orderId`** (seller) — body `{ status:'PLACED'|'DELIVERED' }` → `200 { message:"Order status updated successfully" }`; `400 "You are not authorized to update order status"` (role check).

---

## 11. Data models (TypeScript, as the frontend should model them)

```
type Size = 'XS'|'S'|'M'|'L'|'XL'|'XXL';
type Currency = 'INR'|'USD';
type Role = 'user'|'seller';
type OrderStatus = 'PENDING'|'PLACED'|'SHIPPED'|'DELIVERED'|'CANCELLED';

interface User { id: string; name: string; email: string; role: Role }

interface ProductImage { _id?: string; imageKitId: string; url: string; order: number }
interface ProductSize  { _id?: string; size: Size; stock: number }        // stock >= 0
interface Product {
  id: string;                       // normalise from _id / id
  title: string;                    // 3–20
  description: string;              // 10–200 (model min 3)
  price: { amount: number; currency: Currency };   // amount 0–1,000,000
  category: string[];               // each 3–20
  images: ProductImage[];           // 0–5, sort by order
  sizes: ProductSize[];
  seller: string;                   // userId
  isPublished: boolean;             // default false
  createdAt: string; updatedAt: string;
}

interface CartLine { _id: string; productId: Product; quantity: number; size: Size }  // populated product
interface Cart { _id: string; userId: string; products: CartLine[] }

interface OrderLine {
  product: { title: string; description: string; price: { amount: number; currency: string };
             image: string; productId: string };   // snapshot at purchase
  quantity: number; size: Size;
}
interface Address { state: string; city: string; street: string; house: string; zip: string }
interface Order {
  _id: string; userId: string; address: Address; products: OrderLine[];
  totalPrice: { amount: number; currency: string };   // currently always "INR"
  status: OrderStatus;                                // default PLACED
  createdAt: string; updatedAt: string;
}

interface ApiError { status: number; message: string; fieldErrors?: Record<string,string>;
                     errors?: string[]; sizeError?: {productId:string; message:string}[]; raw?: unknown }
```

Notes: `Product.id` appears as `_id` in list/cart responses and `id` in create/update/publish responses → adapter normalises. `Order` has no seller/payment fields.

---

## 12. Validation rules matrix (frontend must mirror)

| Field | Rule | Source |
| --- | --- | --- |
| Name | required, trim, 3–20 | auth validator |
| Email | required, valid email, unique; model regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` | validator/model |
| Password | required, trim, ≥ 6 | validator |
| Product title | required, 3–20 | validator+model |
| Product description | required, 10–200 (validator) | validator |
| Price amount | number ≥ 0 (≤ 1,000,000 by model) | validator/model |
| Price currency | `INR` \| `USD` | validator/model |
| Category | array of non-empty strings; **each 3–20** (model) | validator/model |
| Sizes | array of `{size ∈ XS..XXL, stock int ≥ 0}` | validator/model |
| Images | create: ≥ 1; total ≤ 5; field name `images` | controller/multer |
| Cart size | one of XS..XXL | validator |
| Cart quantity | integer ≥ 1 (send as number) | validator |
| Address state/city/street/house | required, trimmed | validator |
| Address zip | required (`zipCode` in validator, `zip` in model) | BD-03 |
| Order status update | `PLACED` / `DELIVERED` effective | controller |
| Pagination `page` | integer ≥ 1 | controller |

Validation error format: `{ message:"Validation failed", errors:[string] }` — messages are not keyed by field; keep a small keyword→field mapper and fall back to a form-level alert list. Note the size error text says "Size must be S, M, or L" although XS–XXL are allowed — display your own message.

---

## 13. Error handling & response conventions

### 13.1 HTTP status map (as the backend behaves)

| Situation | Status | Body |
| --- | --- | --- |
| Validation failure | 400 | `{ message, errors[] }` |
| Auth failure (token missing/invalid/expired) | **400** | `{ message:"Error authenticating user", error }` |
| Business rule violation (stock, empty cart, etc.) | 400 | `{ message, … }` |
| Wrong role / not owner (products) | 403 | `{ message }` |
| Wrong role / not owner (orders) | **400** | `{ message }` |
| Not found | 404 (products/cart) or **400** (orders) | `{ message }` |
| Unhandled exception (bad JSON, DB, Multer, upload) | 500 | Express default (may be HTML) |

### 13.2 Client error strategy

1. Adapter parses body safely → `ApiError`.
2. `message` may be a **string or an array** (product create image error) → coerce to string.
3. 400 + auth message → session-invalid flow (F3).
4. Field-level errors → form; others → toast; load failures → inline retry.
5. 5xx/network → "Something went wrong. Please try again." + retry; log to console/monitoring (Sentry P2) without tokens.
6. Never display raw `error` strings from the server (may leak internals) except in dev mode.

---

## 14. Backend defects discovered (with impact on frontend)

| ID | Location | Defect | Frontend impact / workaround |
| --- | --- | --- | --- |
| **BD-01** | `app.js` | `order.route.js` never imported/mounted → all `/api/orders*` return 404 | Orders/checkout blocked; use MSW mocks. |
| **BD-02** | `order.validator.js` | `import {body } from express-validator;` (unquoted) → SyntaxError; app will crash once orders router is imported | Backend must fix before mounting. |
| **BD-03** | validator vs model | Validator needs `address.zipCode`, model requires `address.zip` | Send both keys until fixed. |
| **BD-04** | `order.controller.js` L51-67 | Stock decrement uses `"sizes.stock"` without positional `$` on an array → Mongo error; not atomic/transactional; race conditions | Checkout will 500 until fixed. |
| **BD-05** | `createOrder` | Cart not cleared after order | Refetch cart; may show stale items. |
| **BD-06** | `createOrder`, `getCart` | Currency hard-coded `INR`; totals sum amounts across currencies | Block mixed-currency carts client-side. |
| **BD-07** | `getOrders` | `(await find()).sort(...)` → TypeError (array sort with object) | Orders list 500 until fixed; sort client-side. |
| **BD-08** | `updateOrderStatus` | Only handles `PLACED`/`DELIVERED`; other statuses (incl. `SHIPPED`) silently return 200; missing order → crash; any seller can update any order; 400 instead of 403 | Seller flow limited; `SHIPPED` unreachable. |
| **BD-09** | `cancelOrder` | Stock not restored; errors use 400 | None (UI only shows messages). |
| **BD-10** | `cart.controller.js` addToCart | Uses `size.quantity` (undefined; should be `stock`) so first-add stock check never fires; increment path uses key `" products.$[elem].quantity"` (leading space) and arrayFilter `elem.product` (should be `elem.productId`) → adding an existing line fails; string quantity concatenates; no `isPublished` check | Repeat add fails; cap qty client-side; send numeric quantity. |
| **BD-11** | `cart.route/controller` | Route param `:productid` vs validator/controller `productId` → validator always 400 ("Imvalid Product ID"); validator also demands body; success path calls `res.status()` with no code → throws | Cart decrement/remove unusable until fixed. |
| **BD-12** | `getCart` | Crashes if a referenced product no longer exists (`item.productId` null); unpublished items remain | Defensive rendering. |
| **BD-13** | `getProductsBySeller` | `Math.ceil(products/5)` references `products` before declaration (TDZ) → always 500; should use `totalProduct` | Seller list blocked. |
| **BD-14** | `getProducts` | Empty catalogue → `totalPages=0` → page 0 → negative `skip` error; non-numeric page → NaN; no stable sort (add `createdAt desc`); no filters | Don't request page < 1; handle 500 on empty. |
| **BD-15** | product validator vs model | Category items: validator only non-empty vs model 3–20 chars (→ 500 on save); no non-empty checks for `sizes`/`category`; duplicate sizes allowed; misleading "S, M, or L" message | Enforce rules client-side. |
| **BD-16** | product route | `JSON.parse` of `category/sizes/price` unguarded → malformed → 500 | Always send valid JSON strings. |
| **BD-17** | Multer config | No `limits`/`fileFilter`; >5 files → MulterError 500; non-images accepted | Enforce count/type/size client-side. |
| **BD-18** | `auth.middleware` | Auth failure returns 400 not 401; JWT has no expiry; role frozen in token | Treat 400+message as auth failure. |
| **BD-19** | `app.js` | No global error handler / 404 handler → HTML/plain-text errors | Defensive parsing. |
| **BD-20** | `app.js` | No CORS | Dev proxy / reverse proxy / add `cors`. |
| **BD-21** | all | Inconsistent response envelopes (`product` vs `data`, `message` string vs array, `field`, `sizeError`, `error`) | Adapter normalisation. |
| **BD-22** | auth controller | register/login omit `role` | Call `/me`. |
| **BD-23** | auth | No way to register as seller | Q1 / BG-07. |
| **BD-24** | `deleteImage` | Doesn't delete file from ImageKit; allows removing last image; no existence check | Guard in UI. |
| **BD-25** | product responses | Public list exposes `seller` id, `imageKitId`, `__v` | Ignore in UI. |
| **BD-26** | order model | No seller per line / no payment fields | Seller order views impossible. |
| **BD-27** | auth | Email lookup is case-sensitive, not normalised | Lower-case + trim on client (Q6). |
| **BD-28** | config | Port hard-coded 3000; `.env` (with real secrets) was included in the shared archive | Rotate MongoDB, ImageKit private key and JWT secret; frontend must never bundle them. |
| **BD-29** | cart/publish | Unpublishing a product leaves it in carts; add-to-cart doesn't check `isPublished` | Client warns on unpublished lines. |
| **BD-30** | product model | Title max 20 chars is very restrictive | Product decision (Q7). |

---

## 15. Backend gaps the frontend needs (requests to backend team)

| ID | Endpoint / change | Needed for | Priority |
| --- | --- | --- | --- |
| **BG-01** | `GET /api/products/:id` (public if published; owner sees unpublished; declare **after** `/seller` route) | Product detail, edit form, deep links | **P0** |
| **BG-02** | Listing query params: `q`, `category`, `size`, `minPrice`, `maxPrice`, `sort`, `limit`; return `total` | Search/filter/sort | P1 |
| **BG-03** | `GET /api/products/categories` | Filters, seller category suggestions | P1 |
| **BG-04** | `GET /api/orders/:id` | Order detail/confirmation | P1 |
| **BG-05** | `GET /api/orders/seller` (orders containing seller's products) + full status machine (`PLACED→SHIPPED→DELIVERED`, seller-scoped) | Seller fulfilment | P1 |
| **BG-06** | `PATCH /api/cart/item` (set quantity) and `DELETE /api/cart` (clear) | Cleaner cart UX | P2 |
| **BG-07** | Seller onboarding (`role` on register or "become a seller") | Seller signup | **P0** (or manual DB provisioning) |
| **BG-08** | Payments (gateway, payment status) | Real checkout | P2 |
| **BG-09** | Recipient name/phone, saved addresses | Delivery completeness | P1/P2 |
| **BG-10** | Logout/refresh token/expiry, change password, edit profile | Account | P2 |
| **BG-11** | `DELETE /api/products/:id` (or archive) | Seller catalogue hygiene | P1 |
| **BG-12** | Reorder images / set primary | Seller UX | P2 |
| **BG-13** | Reviews, wishlist | Future | P2 |

**Minimum backend fixes before frontend integration (P0):** BD-01, BD-02, BD-03, BD-04, BD-05, BD-07, BD-10, BD-11, BD-13, BD-20 + BG-01 (+ BG-07 or manual seller accounts).

---

## 16. Non-functional requirements

| Category | Requirement |
| --- | --- |
| Browser support | Last 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari 15+, Android Chrome. |
| Performance | Initial JS ≤ 200 KB gzip on public routes; lazy-load seller console; image lazy-loading; Lighthouse Performance ≥ 85 mobile. |
| Accessibility | WCAG 2.1 AA, keyboard-only flows verified for auth, cart, checkout, seller forms. |
| SEO | Proper `<title>`/meta per product, semantic HTML; SSR/SSG if using Next.js (Q8). |
| Security | CSP, no inline secrets, token only in `Authorization` header, redirect validation, sanitised rendering, HTTPS only in production. |
| Resilience | Retry idempotent GETs (2×, backoff); request timeout 30 s (uploads 120 s); graceful offline message. |
| Testing | Unit (validators, adapters, formatters), component tests, E2E (Playwright): register→browse→add→checkout→cancel; seller create→publish→edit→delete image. Contract tests against mock + real API. |
| Observability | Error tracking (Sentry or similar), basic analytics events (optional). |
| i18n | English only, but keep strings centralised. |

---

## 17. Release plan

| Phase | Scope | Backend dependency |
| --- | --- | --- |
| **0 — Foundation** (≈1 wk) | Project setup, design tokens, layout, API client + adapter, auth store, route guards, MSW mocks, error pages | none |
| **1 — Auth & catalogue** | F1–F4 (+F5 with mock until BG-01) | BD-20, BG-01 |
| **2 — Cart & checkout** | F6, F7, F8, F10 | BD-01…07, BD-10, BD-11 |
| **3 — Seller console** | F11, F12, F13 | BD-13, BG-07 |
| **4 — Enhancements** | F9, F14, filters/search, account, polish, analytics | BG-02…05 |

**Definition of Done (per feature):** implemented against the documented contract; unit/component tests; a11y check; responsive check at 360/768/1280; loading/empty/error states; works with mocks and with real backend (once fixed); no console errors.

---

## 18. Open questions / decisions needed

| # | Question | Suggested default |
| --- | --- | --- |
| Q1 | How do sellers sign up? (role on register, invite, admin, separate flow) | Feature-flagged "Register as seller" toggle; seller accounts provisioned in DB until BG-07. |
| Q2 | Can sellers also shop (cart/orders)? Backend allows it. | Allow; prevent buying own products later (backend). |
| Q3 | Payment method for v1? | "Pay on delivery" text only. |
| Q4 | Mixed-currency carts? | Block checkout, ask to remove items from one currency. |
| Q5 | Guest cart / merge on login? | Out of scope v1 (login required to add). |
| Q6 | Email case normalisation? | Lower-case on client; backend should normalise too. |
| Q7 | Title max 20 chars intentional? | Keep, show counter; revisit. |
| Q8 | Vite SPA vs Next.js (SEO)? | Vite SPA for MVP; Next.js if organic search matters. |
| Q9 | Branding: logo, colours, typography, tone (Snitch identity)? | Needed from design; PRD assumes neutral placeholder tokens. |
| Q10 | Low-stock threshold and shipping/tax display? | ≤5; no shipping/tax lines in v1. |
| Q11 | Should product deletion, returns/refunds, seller payouts be planned? | Post-MVP. |

---

## Appendix A — Sample payloads

**Create product (fields):**

```
title        = "Slim Fit Tee"
description  = "100% cotton, regular length, machine washable."
price        = {"amount":799,"currency":"INR"}
category     = ["tshirts","cotton"]
sizes        = [{"size":"S","stock":10},{"size":"M","stock":5}]
images       = <file1>, <file2>
```

**Add to cart:** `POST /api/cart/add/product/66f…` → `{"size":"M","quantity":1}` **Place order:** `POST /api/orders/` → `{"address":{"state":"Chhattisgarh","city":"Raipur","street":"MG Road","house":"12A","zip":"492001","zipCode":"492001"}}` **Seller mark delivered:** `PATCH /api/orders/status/:orderId` → `{"status":"DELIVERED"}`

## Appendix B — Files reviewed

`server.js`, `package.json`, `docs.md`, `.gitignore`, `.env` (key names only), `src/app/app.js`, `src/config/{config,db}.js`, `src/middleware/auth.middleware.js`, `src/services/storage.service.js`, `src/utils/validate.js`, `src/models/{user,product,cart,order}.model.js`, `src/controllers/{auth,product,cart,order}.controller.js`, `src/routes/{auth,product,cart,order}.route.js`, `src/validators/{auth,product,cart,order}.validator.js`, git metadata (`node_modules` excluded).
