import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";

const CATEGORIES = [
  { label: "Men", to: "/shop?category=Men", tone: "#3b3a33" },
  { label: "Women", to: "/shop?category=Women", tone: "#8a6a52" },
  { label: "Jackets", to: "/shop?category=Jackets", tone: "#5c5a41" },
  { label: "Streetwear", to: "/shop?category=Streetwear", tone: "#1b1a17" },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getProducts(1)
      .then((res) => active && setProducts(res.data.products.slice(0, 8)))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-semibold text-clay">New season</p>
            <h1 className="font-display mt-3 text-5xl font-black leading-[0.95] tracking-tight text-ink sm:text-6xl">
              Create a
              <br />
              fashion vibe
            </h1>
            <p className="mt-5 max-w-sm text-base text-stone">
              Minimal fashion designed for everyday confidence — considered
              pieces you'll want to wear on repeat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="bg-ink px-6 py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
              >
                Shop now
              </Link>
              <Link
                to="/shop"
                className="border border-ink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
              >
                Explore collection
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink md:aspect-[3/4]">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "linear-gradient(160deg, #3b3a33 0%, #16140f 55%, #1b1a17 100%)",
              }}
            />
            <p className="font-display absolute bottom-8 left-8 right-8 text-4xl font-black leading-none text-cream/90">
              HUSH
            </p>
            <p className="absolute left-8 top-8 text-xs font-medium tracking-wide text-cream/70">
              FW / 26 Edit
            </p>
          </div>
        </div>

        {/* Category tiles */}
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pb-16 sm:px-6 md:grid-cols-4 lg:px-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden p-4"
              style={{ backgroundColor: c.tone }}
            >
              <span className="font-display text-lg font-bold text-cream">{c.label}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-cream/80 transition-transform group-hover:translate-x-1">
                Shop now →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-extrabold text-ink">New arrivals</h2>
          <p className="mt-2 text-sm text-stone">Timeless pieces crafted with premium fabrics.</p>
        </div>

        {loading && <p className="text-center text-sm text-stone">Loading products…</p>}
        {error && (
          <p className="mx-auto max-w-md rounded-md border border-line bg-cream-dark p-4 text-center text-sm text-stone">
            Couldn't load products from the backend: {error}
          </p>
        )}
        {!loading && !error && products.length === 0 && (
          <p className="text-center text-sm text-stone">
            No published products yet — add some from the seller dashboard.
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>

        {products.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/shop"
              className="inline-block border border-ink px-6 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-cream"
            >
              View all products
            </Link>
          </div>
        )}
      </section>

      {/* Feature strip */}
      <section className="border-t border-line bg-cream-dark">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            ["Full-stack e-commerce", "Built end to end, from catalog to checkout."],
            ["Modern UI/UX", "Clean layouts, considered spacing, fast interactions."],
            ["Responsive design", "Looks and works great on every screen size."],
            ["Secure & scalable", "JWT auth and a MongoDB-backed catalog."],
          ].map(([title, desc]) => (
            <div key={title}>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs text-stone">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
