import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Contact us</h1>
      <p className="mt-3 text-sm text-stone">
        Questions about an order or a product? Send us a note.
      </p>

      {sent ? (
        <p className="mt-8 border border-line bg-cream-dark p-6 text-sm text-ink">
          Thanks — we'll get back to you within one business day.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="mt-8 space-y-4"
        >
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-stone">Your email</span>
            <input type="email" required className="w-full border border-line bg-cream px-3 py-2.5 text-sm focus:border-ink focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-stone">Message</span>
            <textarea required rows={5} className="w-full border border-line bg-cream px-3 py-2.5 text-sm focus:border-ink focus:outline-none" />
          </label>
          <button type="submit" className="bg-ink px-6 py-3 text-sm font-semibold text-cream hover:opacity-90">
            Send message
          </button>
        </form>
      )}
    </div>
  );
}
