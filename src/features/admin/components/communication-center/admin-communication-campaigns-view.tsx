"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_TYPE_LABELS } from "@/constants/capital-allocation";
import type { ManagerContentItem } from "@/domain/capital-allocation/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pending", label: "Pending Review", status: "submitted" },
  { id: "approved", label: "Approved", status: "approved" },
  { id: "published", label: "Published", status: "published" },
  { id: "rejected", label: "Rejected", status: "rejected" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminCommunicationCampaignsView() {
  const [activeTab, setActiveTab] = useState<TabId>("pending");
  const [campaigns, setCampaigns] = useState<ManagerContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) ?? null;

  const loadCampaigns = useCallback(async (tab: TabId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/communication/campaigns?status=${tab}`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns ?? []);
        setSelectedId((current) => {
          const items = data.campaigns ?? [];
          if (current && items.some((item: ManagerContentItem) => item.id === current)) {
            return current;
          }
          return items[0]?.id ?? null;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns(activeTab);
  }, [activeTab, loadCampaigns]);

  async function reviewCampaign(approve: boolean) {
    if (!selectedCampaign) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/communication/campaigns/${selectedCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, reviewNotes: reviewNotes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");

      toast.success(
        approve
          ? data.investorsNotified > 0
            ? `Campaign published. ${data.investorsNotified} investor(s) notified.`
            : "Campaign published."
          : "Campaign rejected."
      );
      setReviewNotes("");
      setSelectedId(null);
      await loadCampaigns(activeTab);
      if (approve) await loadCampaigns("published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-navy-900">Pool manager campaigns</h2>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <p className="px-5 py-8 text-sm text-navy-500">Loading campaigns...</p>
            ) : campaigns.length === 0 ? (
              <p className="px-5 py-8 text-sm text-navy-500">No campaigns in this section.</p>
            ) : (
              campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedId(campaign.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-navy-50/70",
                    selectedId === campaign.id && "bg-royal-50/40"
                  )}
                >
                  <p className="font-medium text-navy-900">{campaign.title}</p>
                  <p className="text-xs text-navy-500">
                    {campaign.managerName ?? "Pool manager"}
                    {campaign.fundName ? ` · ${campaign.fundName}` : ""}
                  </p>
                  <p className="text-xs text-navy-400">
                    Submitted{" "}
                    {campaign.submittedAt
                      ? new Date(campaign.submittedAt).toLocaleDateString()
                      : new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          {!selectedCampaign ? (
            <p className="text-sm text-navy-500">Select a campaign to review.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Campaign review
                </p>
                <h2 className="mt-1 text-lg font-semibold text-navy-950">{selectedCampaign.title}</h2>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Pool manager</dt>
                  <dd className="mt-1 font-medium text-navy-900">
                    {selectedCampaign.managerName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Pool</dt>
                  <dd className="mt-1 font-medium text-navy-900">
                    {selectedCampaign.fundName ?? "All manager pools"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Type</dt>
                  <dd className="mt-1 font-medium text-navy-900">
                    {CONTENT_TYPE_LABELS[
                      selectedCampaign.contentType as keyof typeof CONTENT_TYPE_LABELS
                    ] ?? selectedCampaign.contentType}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-navy-400">Submitted</dt>
                  <dd className="mt-1 font-medium text-navy-900">
                    {selectedCampaign.submittedAt
                      ? new Date(selectedCampaign.submittedAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Campaign content
                </p>
                <div className="mt-2 rounded-lg border border-border bg-navy-50/40 p-4 text-sm text-navy-800 whitespace-pre-wrap">
                  {selectedCampaign.body}
                </div>
              </div>

              {selectedCampaign.reviewNotes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Review notes
                  </p>
                  <p className="mt-2 text-sm text-navy-700">{selectedCampaign.reviewNotes}</p>
                </div>
              )}

              {activeTab === "pending" && (
                <>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Review notes
                    </p>
                    <Textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      placeholder="Optional notes for the pool manager"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => reviewCampaign(false)}
                    >
                      Reject
                    </Button>
                    <Button type="button" disabled={submitting} onClick={() => reviewCampaign(true)}>
                      {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      Approve & Publish
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
