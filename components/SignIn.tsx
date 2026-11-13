"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, api } from "./ui";

type U = { id: string; name: string; email: string; summary: string };

export function SignIn({ users, next }: { users: U[]; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pick(id: string) {
    setBusy(id);
    setError("");
    try {
      await api("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
      if (next) router.push(next);
      else router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {users.map((u) => (
        <button key={u.id} className="pick" onClick={() => pick(u.id)} disabled={busy !== null}>
          <Avatar id={u.id} name={u.name} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 auto" }}>
            <span style={{ fontWeight: 600 }}>{u.name}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {u.email} · {u.summary}
            </span>
          </span>
          <span className="muted" aria-hidden="true">
            {busy === u.id ? "…" : "→"}
          </span>
        </button>
      ))}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {users.length === 0 && <p className="alert">No demo users found. Run <code>npm run db:seed</code>.</p>}
    </div>
  );
}
