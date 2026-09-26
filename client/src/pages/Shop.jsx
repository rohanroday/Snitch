import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const PAGE_SIZE = 9;
const MAX_PRICE = 10000;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState(() => {
    const c = searchParams.get("category");
    return c ? [c] : [];
  });
  const [sizes, setSizes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [sortBy, setSortBy] = useState("featured");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(1);

  // Fetch every published product (backend has no server-side filtering).
  useEffect(() => {
    let active = true;
    async function loadAll() {
      setLoading(true);
      setError("");
      try {
        let current = 1;
        let total = 1;
        let all = [];
        do {
          const res = await api.getProducts(current);
          all = all.concat(res.data.products);
          total = res.data.totalPages || 1;
          current += 1;
        } while (current <= total);
        if (active) setAllProducts(all);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  // Build the category list from what's actually in the data, instead of a
  // guessed hardcoded list — so checkboxes always match real products.
  const categoryOptions = useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => (p.category || []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [allProducts]);

  const toggle = (list, setList, value) => {
    setPage(1);
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const filtered = useMemo(() => {
    let result = allProducts;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (categories.length) {
      const wanted = categories.map((c) => c.toLowerCase().trim());
      result = result.filter((p) =>
        p.category.some((c) => wanted.includes(c.toLowerCase().trim()))
      );
    }
    if (sizes.length) {
      result = result.filter((p) => p.sizes.some((s) => sizes.includes(s.size) && s.stock > 0));
    }
    result = result.filter((p) => p.price.amount <= maxPrice);

    const sorted = [...result];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price.amount - b.price.amount);
    if (sortBy === "price-desc") sorted.sort((a, b) => b.price.amount - a.price.amount);
    if (sortBy === "newest") sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted;
  }, [allProducts, query, categories, sizes, maxPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAll = () => {
    setCategories([]);
    setSizes([]);
    setMaxPrice(MAX_PRICE);
    setQuery("");
    setSearchParams({});
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">All products</h1>
          <p className="mt-1 text-sm text-stone">
            Search, filter and explore your favourite styles effortlessly.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
          className="w-full max-w-xs"
        >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search for products…"
            className="w-full border border-line bg-cream px-4 py-2 text-sm text-ink placeholder:text-stone focus:border-ink focus:outline-none"
          />
        </form>
      </div>

      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        {/* Filters */}
        <aside className="space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Filters</p>
            <button type="button" onClick={clearAll} className="text-xs text-stone underline hover:text-ink">
              Clear all
            </button>
          </div>

          <FilterGroup title="Category">
            {categoryOptions.length === 0 && (
              <p className="text-xs text-stone">No categories found on your products yet.</p>
            )}
            {categoryOptions.map((c) => (
              <Checkbox
                key={c}
                label={c}
                checked={categories.includes(c)}
                onChange={() => toggle(categories, setCategories, c)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Size">
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(sizes, setSizes, s)}
                  className={`h-8 min-w-8 border px-2 text-xs font-medium transition-colors ${
                    sizes.includes(s)
                      ? "border-ink bg-ink text-cream"
                      : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Price">
            <input
              type="range"
              min={0}
              max={MAX_PRICE}
              step={100}
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setPage(1);
              }}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-stone">
              <span>₹0</span>
              <span>₹{maxPrice.toLocaleString("en-IN")}</span>
            </div>
          </FilterGroup>

          <FilterGroup title="Sort by">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-line bg-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </FilterGroup>
        </aside>

        {/* Grid */}
        <div>
          <p className="mb-4 text-sm text-stone">
            {loading ? "Loading…" : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
          </p>

          {error && (
            <p className="mb-6 rounded-md border border-line bg-cream-dark p-4 text-sm text-stone">
              Couldn't load products from the backend: {error}
            </p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="rounded-md border border-line bg-cream-dark p-8 text-center text-sm text-stone">
              No products match these filters yet.
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
            {pageItems.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-8 w-8 text-sm ${
                    n === page ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--color-ink)]"
      />
      {label}
    </label>
  );
}