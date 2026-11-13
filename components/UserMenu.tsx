"use client";
import { useRouter } from "next/navigation";
import { Avatar, api } from "./ui";

export function UserMenu({ user }: { user: { id: string; name: string } }) {
  const router = useRouter();
  async function switchUser() {
    await api("/api/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className="who">
      <Avatar id={user.id} name={user.name} small />
      <span>{user.name}</span>
      <button className="btn btn-ghost btn-sm" onClick={switchUser}>
        Switch user
      </button>
    </div>
  );
}
