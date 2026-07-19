"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/constants/roles";
import type { UserRole } from "@/constants/roles";

interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = (await res.json()) as { users?: AdminUserRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setUsers(json.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="System Users"
        description="View and manage user accounts. Passwords are never accessible."
      />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" onClick={() => void load(search)}>
          Search
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-navy-500">Loading users…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-navy-50 text-left text-navy-600">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-3">{user.fullName ?? "—"}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{ROLE_LABELS[user.role] ?? user.role}</td>
                  <td className="p-3">{user.isActive ? "Active" : "Inactive"}</td>
                  <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
