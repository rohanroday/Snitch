import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/shop?category=Jackets", label: "Collection" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function IconButton({ children, onClick, to, label, badge }) {
  const cls =
    "relative flex h-9 w-9 items-center justify-center text-ink hover:text-stone transition-colors";
  const content = (
    <>
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-cream">
          {badge}
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={label} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-2xl font-extrabold tracking-tight text-ink">
          HUSH
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `text-sm text-ink transition-colors hover:text-stone ${
                  isActive ? "font-semibold" : "font-medium"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div className="relative hidden sm:block">
            {searchOpen ? (
              <form onSubmit={submitSearch} className="flex items-center">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => !query && setSearchOpen(false)}
                  placeholder="Search products…"
                  className="w-48 border-b border-ink bg-transparent py-1 text-sm text-ink placeholder:text-stone focus:outline-none"
                />
              </form>
            ) : (
              <IconButton label="Search" onClick={() => setSearchOpen(true)}>
                <SearchIcon />
              </IconButton>
            )}
          </div>

          {user ? (
            <IconButton to="/profile" label="Account">
              <UserIcon />
            </IconButton>
          ) : (
            <IconButton to="/login" label="Sign in">
              <UserIcon />
            </IconButton>
          )}

          <IconButton to="/profile?tab=wishlist" label="Wishlist">
            <HeartIcon />
          </IconButton>

          <IconButton to="/cart" label="Cart" badge={count}>
            <BagIcon />
          </IconButton>

          {user && (
            <button
              type="button"
              onClick={logout}
              className="ml-2 hidden text-xs font-medium text-stone hover:text-ink sm:block"
            >
              Log out
            </button>
          )}

          <button
            type="button"
            className="ml-1 flex h-9 w-9 items-center justify-center md:hidden"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-line bg-cream px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="py-2 text-sm font-medium text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20s-7-4.4-9.5-8.8C.9 8 2 4.5 5.5 4c2-.3 3.7.8 6.5 3.5C14.8 4.8 16.5 3.7 18.5 4c3.5.5 4.6 4 3 7.2C19 15.6 12 20 12 20Z" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
