export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">About HUSH</h1>
      <p className="mt-4 text-sm leading-relaxed text-stone">
        HUSH is a modern fashion edit built around minimal style and considered
        materials. This storefront is a full-stack demo connected to a
        Node.js/Express and MongoDB backend — catalog, cart and checkout all
        run against real API calls.
      </p>
      <h2 className="mt-8 text-sm font-semibold text-ink">Returns</h2>
      <p className="mt-2 text-sm text-stone">Unworn items can be returned within 7 days of delivery.</p>
      <h2 className="mt-6 text-sm font-semibold text-ink">Shipping</h2>
      <p className="mt-2 text-sm text-stone">Standard shipping is ₹99 and typically arrives in 4–6 business days.</p>
    </div>
  );
}
