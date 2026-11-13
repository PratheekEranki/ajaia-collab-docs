"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo, api } from "@/components/ui";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await api("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="signin">
      <div className="signin-inner">
        <span className="brand">
          <Logo size={28} /> Ajaia Docs
        </span>
        {done ? (
          <div className="stack">
            <h1>Request sent</h1>
            <p className="note">
              An admin will review your request for <strong>{form.email}</strong>. Once it&apos;s approved, sign in with the password you just chose.
            </p>
            <Link href="/" className="btn">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="stack">
            <h1>Request an account</h1>
            <p className="muted" style={{ margin: 0 }}>
              Accounts are approved by an admin before they can be used.
            </p>
            <label className="field-label" htmlFor="name">Full name</label>
            <input id="name" className="field" required autoComplete="name" value={form.name} onChange={set("name")} />
            <label className="field-label" htmlFor="email">Work email</label>
            <input id="email" className="field" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
            <label className="field-label" htmlFor="password">Password (8+ characters)</label>
            <input id="password" className="field" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
            <label className="field-label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" className="field" type="password" required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
            {error && <p className="alert" role="alert">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Already have an account? <Link href="/">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
