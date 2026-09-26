import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-display text-2xl font-extrabold text-ink">HUSH</p>
      <h1 className="mt-6 text-xl font-semibold text-ink">Create an account</h1>
      <p className="mt-1 text-sm text-stone">Join HUSH for a faster checkout and order tracking.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Full name" value={form.name} onChange={set("name")} required />
        <Field label="Email address" type="email" value={form.email} onChange={set("email")} required />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          required
          hint="At least 6 characters."
        />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-ink underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
