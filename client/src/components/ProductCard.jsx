import { Link } from "react-router-dom";
import { useState } from "react";

const SWATCH_COLORS = {
  black: "#1b1a17",
  white: "#f4f0e8",
  beige: "#cdbfa4",
  green: "#4c5a41",
  brown: "#6b4a33",
  navy: "#28324a",
  red: "#8c2f22",
};

function formatPrice(price) {
  if (!price) return "";
  const symbol = price.currency === "USD" ? "$" : "₹";
  return `${symbol}${price.amount.toLocaleString("en-IN")}`;
}

export default function ProductCard({ product }) {
  const [wished, setWished] = useState(false);
  const cover = product.images?.[0]?.url;
  const colors = [...new Set((product.category || []).map((c) => c.toLowerCase()))]
    .filter((c) => SWATCH_COLORS[c])
    .slice(0, 3);

  return (
    <div className="group">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
        <Link to={`/product/${product._id}`}>
          {cover ? (
            <img
              src={cover}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-stone">
              No image
            </div>
          )}
        </Link>
        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => setWished((w) => !w)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-ink shadow-sm"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20s-7-4.4-9.5-8.8C.9 8 2 4.5 5.5 4c2-.3 3.7.8 6.5 3.5C14.8 4.8 16.5 3.7 18.5 4c3.5.5 4.6 4 3 7.2C19 15.6 12 20 12 20Z" />
          </svg>
        </button>
      </div>

      <Link to={`/product/${product._id}`} className="mt-3 block">
        <h3 className="text-sm font-medium text-ink">{product.title}</h3>
        <p className="mt-1 text-sm text-stone">{formatPrice(product.price)}</p>
        {colors.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {colors.map((c) => (
              <span
                key={c}
                className="h-3 w-3 rounded-full border border-line"
                style={{ backgroundColor: SWATCH_COLORS[c] }}
              />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}

export { formatPrice };
