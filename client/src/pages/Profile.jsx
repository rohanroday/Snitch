import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const SIDEBAR = [
  { key: "profile", label: "My Profile" },
  { key: "orders", label: "My Orders" },
  { key: "wishlist", label: "Wishlist" },
  { key: "addresses", label: "Addresses" },
  { key: "settings", label: "Settings" },
];

const ORDER_TABS = ["All", "PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];

const STATUS_STYLES = {
  DELIVERED: "bg-emerald-100 text-emerald-800",
  SHIPPED: "bg-sky-100 text-sky-800",
  PLACED: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "profile";

  if (loading) {
    return <p className="px-4 py-24 text-center text-sm text-stone">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to view your account</h1>
        <Link
          to="/login"
          state={{ from: "/profile" }}
          className="mt-6 inline-block bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display mb-8 text-3xl font-extrabold text-ink">My account</h1>
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 border border-line p-2 h-fit">
          {SIDEBAR.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ tab: item.key })}
              className={`block w-full px-4 py-2.5 text-left text-sm ${
                tab === item.key ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={logout}
            className="block w-full px-4 py-2.5 text-left text-sm text-stone hover:bg-cream-dark hover:text-ink"
          >
            Logout
          </button>
        </aside>

        <div>
          {tab === "profile" && <ProfilePanel user={user} />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "wishlist" && <WishlistPanel />}
          {tab === "addresses" && <AddressesPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user }) {
  return (
    <div className="border border-line p-6">
      <h2 className="text-sm font-semibold text-ink">Profile details</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between border-b border-line pb-3">
          <dt className="text-stone">Name</dt>
          <dd className="text-ink">{user?.name}</dd>
        </div>
        <div className="flex justify-between border-b border-line pb-3">
          <dt className="text-stone">Email</dt>
          <dd className="text-ink">{user?.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone">Account type</dt>
          <dd className="text-ink capitalize">{user?.role}</dd>
        </div>
      </dl>
    </div>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    let active = true;
    api
      .getOrders()
      .then((res) => active && setOrders(res.data.orders))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = statusFilter === "All" ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {ORDER_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setStatusFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium ${
              statusFilter === t ? "bg-ink text-cream" : "border border-line text-ink"
            }`}
          >
            {t === "PLACED" ? "Processing" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone">Loading orders…</p>}

      {error && (
        <p className="border border-line bg-cream-dark p-4 text-sm text-stone">
          Couldn't load orders: {error}. This backend's order endpoints need{" "}
          <code className="text-xs">order.route.js</code> mounted in <code className="text-xs">app.js</code>{" "}
          and the syntax error in <code className="text-xs">order.validator.js</code> fixed.
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
          No orders here yet.
        </p>
      )}

      <ul className="space-y-4">
        {filtered.map((order) => (
          <li key={order._id} className="border border-line p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">Order #{order._id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-stone">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[order.status] || "bg-cream-dark text-ink"}`}>
                {order.status}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {order.products.slice(0, 4).map((p, i) => (
                <div key={i} className="h-12 w-10 overflow-hidden bg-cream-dark">
                  {p.product?.image && <img src={p.product.image} alt="" className="h-full w-full object-cover" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-stone">{order.products.length} items</span>
              <span className="font-semibold text-ink">₹{order.totalPrice?.amount?.toLocaleString("en-IN")}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WishlistPanel() {
  return (
    <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
      Wishlist items you save while browsing will show up here. The current backend
      doesn't persist a wishlist yet — this is a UI placeholder for that feature.
    </div>
  );
}

function AddressesPanel() {
  return (
    <div className="border border-line bg-cream-dark p-8 text-center text-sm text-stone">
      Saved addresses aren't stored by the backend yet — for now, enter your address
      each time you check out.
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="border border-line p-6 text-sm text-stone">
      Account settings (password reset, notification preferences) aren't exposed by
      the backend API yet.
    </div>
  );
}
