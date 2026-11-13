"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, api } from "./ui";

export function UserMenu({ user }: { user: { id: string; name: string; isAdmin?: boolean } }) {
  const router = useRouter();
  async function signOut() {
    await api("/api/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className="who">
      {user.isAdmin && (
        <Link href="/admin" className="btn btn-ghost btn-sm">
          Admin
        </Link>
      )}
      <Avatar id={user.id} name={user.name} small />
      <span>{user.name}</span>
      <button className="btn btn-ghost btn-sm" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
