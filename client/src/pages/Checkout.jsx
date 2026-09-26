import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const STEPS = ["Cart", "Address", "Payment", "Order"];

export default function Checkout() {
  const { user } = useAuth();
  const { items, totalPrice, refresh } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ house: "", street: "", city: "", state: "", zip: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  const update = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.createOrder(address);
      setPlaced(res.data.order);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to check out</h1>
        <p className="mt-2 text-sm text-stone">Orders are tied to your HUSH account.</p>
        <Link
          to="/login"
          state={{ from: "/checkout" }}
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-stone">Add something to your cart before checking out.</p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Order placed</h1>
        <p className="mt-2 text-sm text-stone">
          Order #{placed._id?.slice(-6).toUpperCase()} — total ₹{placed.totalPrice?.amount?.toLocaleString("en-IN")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/profile?tab=orders")}
          className="mt-6 bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          View my orders
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display mb-8 text-3xl font-extrabold text-ink">Checkout</h1>

      <ol className="mb-10 flex items-center justify-center gap-6">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-xs text-stone">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                i <= 1 ? "bg-ink text-cream" : "border border-line text-stone"
              }`}
            >
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="space-y-5 border border-line p-6">
        <h2 className="text-sm font-semibold text-ink">Shipping address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="House / flat no." value={address.house} onChange={update("house")} required />
          <Field label="Street" value={address.street} onChange={update("street")} required />
          <Field label="City" value={address.city} onChange={update("city")} required />
          <Field label="State" value={address.state} onChange={update("state")} required />
          <Field label="ZIP / postal code" value={address.zip} onChange={update("zip")} required />
        </div>

        {error && (
          <p className="rounded-md border border-line bg-cream-dark p-3 text-sm text-stone">
            Couldn't place the order: {error}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-line pt-5">
          <p className="text-sm text-stone">
            Order total: <span className="font-semibold text-ink">₹{(totalPrice + 99).toLocaleString("en-IN")}</span>
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-stone">{label}</span>
      <input
        {...props}
        className="w-full border border-line bg-cream px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </label>
  );
}
