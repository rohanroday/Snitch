import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream-dark">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-2xl font-extrabold text-ink">HUSH</p>
          <p className="mt-3 max-w-xs text-sm text-stone">
            Minimal fashion designed for everyday confidence.
          </p>
        </div>
        <FooterCol
          title="Shop"
          links={[
            ["New Arrivals", "/shop"],
            ["Men", "/shop?category=Men"],
            ["Women", "/shop?category=Women"],
            ["Jackets", "/shop?category=Jackets"],
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            ["Contact", "/contact"],
            ["Returns", "/about"],
            ["Shipping", "/about"],
            ["Size Guide", "/shop"],
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            ["Sign in", "/login"],
            ["Create account", "/register"],
            ["My orders", "/profile"],
            ["Cart", "/cart"],
          ]}
        />
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-stone sm:px-6 lg:px-8">
        © {new Date().getFullYear()} HUSH. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-sm text-stone hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
