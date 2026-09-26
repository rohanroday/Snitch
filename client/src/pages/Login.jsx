import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || "/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-display text-2xl font-extrabold text-ink">HUSH</p>
      <h1 className="mt-6 text-xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-stone">Welcome back — sign in to your account.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email address" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
        <Field label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} required />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-ink underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, required, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-stone">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-line bg-cream px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
      {hint && <span className="mt-1 block text-[11px] text-stone">{hint}</span>}
    </label>
  );
}
