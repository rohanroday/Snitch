# HUSH — Frontend

A React (Vite) storefront for the HUSH fashion backend, matching the provided
UI mockups: home, product listing, product detail, cart & checkout, and
authentication/profile with orders.

## Setup

```bash
npm install
cp .env.example .env   # edit VITE_API_BASE_URL if your backend isn't on :3000
npm run dev
```

The app expects the backend from `server.js` running and reachable at
`VITE_API_BASE_URL` (default `http://localhost:3000/api`). Enable CORS on the
backend (it currently has none configured) or serve both from the same origin,
otherwise the browser will block the requests.

## What's wired up to the real API

- **Auth** — register, login, `GET /api/auth/me` (JWT stored in
  `localStorage`, sent as `Authorization: Bearer <token>`).
- **Products** — `GET /api/products` (paginated). The Shop page walks every
  page once, then filters/sorts/searches client-side, because the backend
  doesn't support query-string filters.
- **Product detail** — there's no `GET /api/products/:id` endpoint, so the
  detail page looks the product up from the page(s) already fetched
  (`ProductsContext`), fetching more pages if needed.
- **Cart** — `GET /api/cart`, add/remove via
  `POST /cart/add/product/:id` and `DELETE /cart/remove/product/:id`.
- **Checkout/Orders** — calls `POST /api/orders` and `GET /api/orders`. As
  reviewed earlier, these currently won't work until the backend fixes are
  made (see below) — the checkout and orders screens show the backend's
  error message inline rather than failing silently.

## Known backend issues this UI is already tolerant of

From the earlier code review of `server/`, a few backend bugs affect what
you'll see in the running app until they're fixed:

1. `order.route.js` isn't mounted in `app.js`, and `order.validator.js` has a
   `import ... from express-validator;` syntax error (missing quotes) — so
   checkout and "My Orders" will show a fetch error until both are fixed.
2. `removeProductFromCart`'s route param is `:productid` but the validator
   checks `req.params.productId` (case mismatch) — removing a cart item may
   fail validation. `res.status()` is also called with no status code there.
3. `addToCart`'s stock check compares against `size.quantity` (doesn't
   exist) instead of `size.stock`, and the "increase quantity" cart update
   has a typo'd field key, so raising quantity on an item already in the
   cart silently no-ops.
4. `getProductsBySeller` references `products` before it's declared
   (crashes) — not used by this customer-facing UI, but relevant if you add
   a seller dashboard.
5. There's no `GET /api/products/:id` route — see "Product detail" above for
   how the frontend works around it.

None of these need frontend changes to fix — they're all in `server/src/`.

## Design notes

- Palette, type (Archivo for display / Inter for body) and layout follow the
  provided HUSH mockups. Hero/category imagery is CSS-only (no stock photos
  bundled), since the backend has no CMS/banner content — swap in real
  photography via the `images` array pattern already used for products.
- Wishlist, saved addresses and account settings are UI-only placeholders:
  the backend doesn't have endpoints for them yet.

## Structure

```
src/
  api/client.js          fetch wrapper + typed API calls
  context/                Auth, Cart, Products (React Context)
  components/              Navbar, Footer, ProductCard
  pages/                   Home, Shop, ProductDetail, Cart, Checkout,
                           Login, Register, Profile, About, Contact
```
