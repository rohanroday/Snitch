import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../components/ProductCard";

const SHIPPING = 99;
const DISCOUNT = 0;

export default function Cart() {
  const { user } = useAuth();
  const { items, totalPrice, loading, error, addItem, removeItem, refresh } = useCart();
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to view your cart</h1>
        <p className="mt-2 text-sm text-stone">Your cart is tied to your HUSH account.</p>
        <Link
          to="/login"
          state={{ from: "/cart" }}
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const keyFor = (item) => `${item.productId?._id}-${item.size}`;

  const changeQty = async (item, delta) => {
    const key = keyFor(item);
    setBusyKey(key);
    setActionError("");
    try {
      if (delta > 0) {
        await addItem(item.productId._id, item.size, 1);
      } else {
        await removeItem(item.productId._id, item.size, 1);
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const removeLine = async (item) => {
    const key = keyFor(item);
    setBusyKey(key);
    setActionError("");
    try {
      await removeItem(item.productId._id, item.size, item.quantity);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const subtotal = totalPrice;
  const total = Math.max(0, subtotal + (items.length ? SHIPPING : 0) - DISCOUNT);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display mb-8 text-3xl font-extrabold text-ink">
        Your cart {items.length > 0 && `(${items.length})`}
      </h1>

      {loading && <p className="text-sm text-stone">Loading cart…</p>}
      {error && (
        <p className="mb-6 rounded-md border border-line bg-cream-dark p-4 text-sm text-stone">
          Couldn't load your cart: {error}
        </p>
      )}
      {actionError && (
        <p className="mb-6 rounded-md border border-line bg-cream-dark p-4 text-sm text-stone">
          {actionError}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-md border border-line bg-cream-dark p-10 text-center">
          <p className="text-sm text-stone">Your cart is empty.</p>
          <Link to="/shop" className="mt-4 inline-block border border-ink px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink hover:text-cream">
            Continue shopping
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-10 md:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => {
              const key = keyFor(item);
              const busy = busyKey === key;
              const product = item.productId;
              const maxStock = product?.sizes?.find((s) => s.size === item.size)?.stock ?? 99;
              return (
                <li key={key} className="flex gap-4 py-5">
                  <div className="h-20 w-16 flex-shrink-0 overflow-hidden bg-cream-dark">
                    {product?.images?.[0]?.url && (
                      <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link to={`/product/${product?._id}`} className="text-sm font-medium text-ink hover:underline">
                        {product?.title ?? "Product"}
                      </Link>
                      <p className="mt-1 text-sm text-stone">{formatPrice(product?.price)}</p>
                      <p className="mt-1 text-xs text-stone">{item.size}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-line">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => changeQty(item, -1)}
                          className="flex h-8 w-8 items-center justify-center text-ink disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busy || item.quantity >= maxStock}
                          onClick={() => changeQty(item, 1)}
                          className="flex h-8 w-8 items-center justify-center text-ink disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeLine(item)}
                        aria-label="Remove item"
                        className="text-stone hover:text-ink disabled:opacity-40"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="h-fit border border-line p-6">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
              <Row label="Shipping" value={`₹${SHIPPING}`} />
              {DISCOUNT > 0 && <Row label="Discount" value={`−₹${DISCOUNT}`} highlight />}
              <div className="border-t border-line pt-3">
                <Row label="Total" value={`₹${total.toLocaleString("en-IN")}`} bold />
              </div>
            </dl>
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="mt-6 w-full bg-ink py-3 text-sm font-semibold text-cream hover:opacity-90"
            >
              Proceed to checkout
            </button>
            <Link
              to="/shop"
              className="mt-3 block text-center text-xs text-stone hover:text-ink"
            >
              ← Continue shopping
            </Link>
            <p className="mt-6 text-center text-[11px] text-stone">
              Cards · UPI · Netbanking accepted at checkout
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-stone ${bold ? "font-semibold text-ink" : ""}`}>{label}</dt>
      <dd className={`${bold ? "text-base font-semibold text-ink" : highlight ? "text-clay" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" />
    </svg>
  );
}
