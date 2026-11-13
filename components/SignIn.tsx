"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, api } from "./ui";

const DEMO = [
  { name: "Alice Chen", email: "alice@ajaia.dev", note: "Admin · owns 2 docs" },
  { name: "Bob Rivera", email: "bob@ajaia.dev", note: "Editor on Alice's plan" },
  { name: "Carol Okafor", email: "carol@ajaia.dev", note: "Owns 1 doc" },
];
const DEMO_PASSWORD = "ajaia-demo";

export function SignIn({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (next) router.push(next);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="signin">
      <div className="signin-inner">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="brand">
            <Logo size={28} /> Ajaia Docs
          </span>
          <h1>Sign in</h1>
        </div>

        <form onSubmit={submit} className="stack">
          <label className="field-label" htmlFor="email">
            Work email
          </label>
          <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            New to Ajaia Docs? <Link href="/signup">Request an account</Link>. An admin approves new accounts.
          </p>
        </form>

        <section className="demo-box" aria-labelledby="demo-title">
          <h2 id="demo-title">Demo accounts for reviewers</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Password for all three: <code>{DEMO_PASSWORD}</code>. Click one to fill the form.
          </p>
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              className="demo-pick"
              onClick={() => {
                setEmail(d.email);
                setPassword(DEMO_PASSWORD);
              }}
            >
              <strong>{d.name}</strong>
              <span className="mono">
                {d.email} · {d.note}
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
