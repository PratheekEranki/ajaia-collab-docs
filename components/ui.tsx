// Small shared UI pieces.
import Link from "next/link";

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M6 3h11l6 6v16H6z" stroke="#0B6B66" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 3v6h6" stroke="#0B6B66" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 15h9M10 19h6" stroke="#0B6B66" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand">
      <Logo /> Ajaia Docs
    </Link>
  );
}

const known = new Set(["alice", "bob", "carol"]);
export function Avatar({ id, name, small }: { id: string; name: string; small?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`av ${small ? "av-sm " : ""}av-${known.has(id) ? id : "other"}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function RoleTag({ role, label }: { role: "OWNER" | "EDITOR" | "VIEWER"; label?: string }) {
  const text = label ?? { OWNER: "Owner", EDITOR: "Editor", VIEWER: "Viewer" }[role];
  return <span className={`tag ${role === "OWNER" ? "tag-own" : "tag-shared"}`}>{text}</span>;
}

/** Calls an API route and returns parsed JSON, throwing the server's user-facing message on failure. */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status}).`);
  return body as T;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const sameDay = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
