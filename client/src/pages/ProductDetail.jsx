import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../context/ProductsContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const { getById } = useProducts();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setNotFound(false);
    getById(id).then((p) => {
      if (!active) return;
      if (p) {
        setProduct(p);
        setSize(p.sizes.find((s) => s.stock > 0)?.size ?? p.sizes[0]?.size ?? null);
      } else {
        setNotFound(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id, getById]);

  const selectedSize = product?.sizes.find((s) => s.size === size);

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    if (!size) {
      setStatus({ type: "error", message: "Please select a size." });
      return;
    }
    setAdding(true);
    setStatus({ type: "", message: "" });
    try {
      await addItem(product._id, size, qty);
      setStatus({ type: "success", message: "Added to cart." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setAdding(false);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Product not found</h1>
        <p className="mt-2 text-sm text-stone">
          This item may have been unpublished or removed.
        </p>
        <Link to="/shop" className="mt-6 inline-block border border-ink px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink hover:text-cream">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return <p className="px-4 py-24 text-center text-sm text-stone">Loading product…</p>;
  }

  const images = product.images?.length ? product.images : [{ url: null }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-stone">
        <Link to="/" className="hover:text-ink">Home</Link> /{" "}
        <Link to="/shop" className="hover:text-ink">Shop</Link> /{" "}
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex gap-3">
          <div className="hidden flex-col gap-2 sm:flex">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`h-16 w-14 overflow-hidden border ${
                  i === activeImage ? "border-ink" : "border-line"
                }`}
              >
                {img.url ? (
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-cream-dark" />
                )}
              </button>
            ))}
          </div>
          <div className="aspect-[4/5] w-full flex-1 overflow-hidden bg-cream-dark">
            {images[activeImage]?.url ? (
              <img
                src={images[activeImage].url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-stone">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{product.title}</h1>
          <p className="mt-3 text-xl text-ink">{formatPrice(product.price)}</p>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-stone">{product.description}</p>

          {product.category?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.category.map((c) => (
                <span key={c} className="border border-line px-2.5 py-1 text-xs text-stone">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Size</p>
              <span className="text-xs text-stone">
                {selectedSize ? `${selectedSize.stock} in stock` : "Select a size"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={s.stock === 0}
                  onClick={() => setSize(s.size)}
                  className={`h-10 min-w-10 border px-3 text-sm font-medium transition-colors ${
                    size === s.size
                      ? "border-ink bg-ink text-cream"
                      : s.stock === 0
                      ? "cursor-not-allowed border-line text-stone/50 line-through"
                      : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {s.size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-line">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center text-ink"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(selectedSize?.stock ?? 99, q + 1))}
                className="flex h-11 w-11 items-center justify-center text-ink"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={adding || !selectedSize || selectedSize.stock === 0}
              onClick={handleAddToCart}
              className="flex-1 bg-ink py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? "Adding…" : selectedSize?.stock === 0 ? "Out of stock" : "Add to cart"}
            </button>
          </div>

          {status.message && (
            <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-700" : "text-ink"}`}>
              {status.message}
            </p>
          )}

          <div className="mt-4 flex items-center gap-5 text-sm">
            <button
              type="button"
              onClick={() => setWished((w) => !w)}
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              {wished ? "Added to wishlist" : "Add to wishlist"}
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Share
            </button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6 text-xs text-stone">
            <div>
              <p className="font-semibold text-ink">Free delivery</p>
              <p className="mt-1">On eligible orders</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Easy returns</p>
              <p className="mt-1">7 days return policy</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Secure payment</p>
              <p className="mt-1">Protected checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
