"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AdminFund } from "@/features/admin/types";
import {
  AdminPoolFormEditor,
  EMPTY_POOL_FORM,
  adminFundToForm,
  poolFormToPayload,
  type PoolFormFields,
} from "@/features/admin/components/admin-pool-form-editor";
import {
  AdminMarketplacePanel,
  type MarketplaceAdminFields,
} from "@/features/admin/components/admin-marketplace-panel";

interface InvestorOption {
  id: string;
  fullName: string;
  email: string;
}

export function AdminPoolsManager({
  funds,
  investors,
  reviewOnly = true,
}: {
  funds: AdminFund[];
  investors: InvestorOption[];
  reviewOnly?: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteFundId, setInviteFundId] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState<PoolFormFields>(EMPTY_POOL_FORM);
  const [editForm, setEditForm] = useState<PoolFormFields>(EMPTY_POOL_FORM);

  const editingFund = funds.find((f) => f.id === editingId);

  async function createPool() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...poolFormToPayload(createForm), status: "active" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      toast.success("Pool created");
      setShowForm(false);
      setCreateForm(EMPTY_POOL_FORM);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(fundId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pools/${fundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poolFormToPayload(editForm, true)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      toast.success("Pool updated");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function deletePool(fund: AdminFund) {
    if (!fund.canDelete) {
      toast.error("Pool can only be deleted after all investors have settled and left.");
      return;
    }
    if (!window.confirm(`Delete ${fund.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/pools/${fund.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      toast.success("Pool deleted");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function inviteInvestor(fundId: string) {
    if (!inviteUserId) {
      toast.error("Select an investor");
      return;
    }
    try {
      const res = await fetch(`/api/admin/pools/${fundId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: inviteUserId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Invite failed");
      toast.success("Invitation sent");
      setInviteFundId(null);
      setInviteUserId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    }
  }

  function openEdit(fund: AdminFund) {
    setEditingId(fund.id);
    setEditForm(adminFundToForm(fund));
    setShowForm(false);
  }

  async function approvePool(poolId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/managed-pools/${poolId}/approve`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Approve failed");
      toast.success("Pool approved and is now live");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!reviewOnly && (
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setEditingId(null);
          }}
        >
          <Plus className="h-4 w-4" />
          Create Pool
        </Button>
      </div>
      )}

      {!reviewOnly && showForm && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-semibold text-navy-950">New trading pool</h3>
          <AdminPoolFormEditor form={createForm} onChange={setCreateForm} />
          <div className="mt-3 flex gap-2">
            <Button disabled={saving} onClick={createPool}>
              Save pool
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {editingFund && (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-navy-950">Edit {editingFund.name}</h3>
            <Button
              size="sm"
              variant="destructive"
              disabled={!editingFund.canDelete}
              onClick={() => deletePool(editingFund)}
            >
              <Trash2 className="h-4 w-4" />
              Delete pool
            </Button>
          </div>
          {!editingFund.canDelete && (
            <p className="mb-3 text-xs text-navy-500">
              Delete unlocks when no investors have active allocations in this pool.
            </p>
          )}
          <AdminPoolFormEditor
            form={editForm}
            onChange={setEditForm}
            showAdditionalCapital
            currentCapital={editingFund.currentCapital}
          />
          <AdminMarketplacePanel
            fundId={editingFund.id}
            initial={fundToMarketplaceFields(editingFund)}
          />
          <div className="mt-3 flex gap-2">
            <Button disabled={saving} onClick={() => saveEdit(editingFund.id)}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Pair</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Raised</TableHead>
            <TableHead>Returns</TableHead>
            <TableHead>Investors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funds.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border"
                    style={{ backgroundColor: f.cardBackgroundColor ?? "#0f1623" }}
                  />
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="max-w-xs truncate text-xs text-navy-500">{f.poolDescription}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {f.poolManagerName ? (
                  <div className="flex items-center gap-2">
                    {f.poolManagerIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.poolManagerIconUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : null}
                    {f.poolManagerName}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{f.tradingPair}</TableCell>
              <TableCell className="font-mono text-sm">{formatCurrency(f.targetCapital)}</TableCell>
              <TableCell className="font-mono text-sm">{formatCurrency(f.currentCapital)}</TableCell>
              <TableCell className="text-xs text-navy-600">
                {f.returnTiers.length} tier{f.returnTiers.length === 1 ? "" : "s"}
              </TableCell>
              <TableCell>
                {f.activeInvestors} / {f.targetInvestors}
              </TableCell>
              <TableCell className="capitalize text-sm text-navy-600">
                {f.lifecycleStatus.replace(/_/g, " ")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {(f.lifecycleStatus === "submitted" || f.lifecycleStatus === "under_review") && (
                    <Button size="sm" disabled={saving} onClick={() => void approvePool(f.id)}>
                      Approve & Go Live
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {inviteFundId === f.id ? (
                    <>
                      <select
                        className="rounded border px-2 py-1 text-sm"
                        value={inviteUserId}
                        onChange={(e) => setInviteUserId(e.target.value)}
                      >
                        <option value="">Select investor</option>
                        {investors.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.fullName}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => inviteInvestor(f.id)}>
                        Send
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setInviteFundId(f.id)}>
                      Invite
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function fundToMarketplaceFields(fund: AdminFund): MarketplaceAdminFields {
  return {
    isMarketplaceListed: fund.isMarketplaceListed,
    featured: fund.featured,
    tagline: fund.tagline ?? "",
    categories: fund.categories.join(", "),
    securityRating: fund.securityRating ?? "",
    aggressivenessLevel: fund.aggressivenessLevel ?? "",
    poolHealth: fund.poolHealth,
    capacityStatus: fund.capacityStatus,
    ryvonxRating: fund.ryvonxRating != null ? String(fund.ryvonxRating) : "",
    suggestedInvestment:
      fund.suggestedInvestment != null ? String(fund.suggestedInvestment) : "",
    riskSummary: fund.riskSummary ?? "",
    adminComments: fund.adminComments ?? "",
    coverImageUrl: fund.coverImageUrl ?? "",
    logoUrl: fund.logoUrl ?? "",
    lifecycleStatus: fund.lifecycleStatus,
    maxAum: fund.maxAum != null ? String(fund.maxAum) : "",
    maxInvestorsCap: fund.maxInvestorsCap != null ? String(fund.maxInvestorsCap) : "",
  };
}
