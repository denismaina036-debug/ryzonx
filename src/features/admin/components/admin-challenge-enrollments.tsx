"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { ChallengeEnrollment } from "@/features/investor/types";

type AdminEnrollment = ChallengeEnrollment & {
  investorName: string;
  investorEmail: string;
  challengeTitle: string;
};

interface AdminChallengeEnrollmentsProps {
  enrollments: AdminEnrollment[];
}

export function AdminChallengeEnrollments({
  enrollments,
}: AdminChallengeEnrollmentsProps) {
  const [drafts, setDrafts] = useState<
    Record<string, { accountDetails: string; rules: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);

  async function sendSetup(id: string) {
    const draft = drafts[id];
    if (!draft?.accountDetails.trim() || !draft?.rules.trim()) {
      toast.error("Enter account credentials and rules");
      return;
    }

    setSaving(id);
    try {
      const res = await fetch(`/api/admin/challenge/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountDetails: draft.accountDetails,
          rules: draft.rules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Challenge account sent to investor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(null);
    }
  }

  if (enrollments.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-navy-500">
        No pending challenge enrollments.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((e) => (
        <Card key={e.id} className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-950">{e.investorName}</p>
              <p className="text-sm text-navy-500">{e.investorEmail}</p>
              <p className="mt-1 text-sm text-navy-600">
                {e.challengeTitle} · {e.status} ·{" "}
                {e.paymentMethod === "crypto" ? "Crypto" : "Balance"}
              </p>
            </div>
          </div>

          {e.status === "awaiting_setup" && (
            <>
              <Textarea
                placeholder="Challenge account login, server, password..."
                value={drafts[e.id]?.accountDetails ?? ""}
                onChange={(ev) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [e.id]: {
                      accountDetails: ev.target.value,
                      rules: prev[e.id]?.rules ?? "",
                    },
                  }))
                }
                rows={3}
              />
              <Textarea
                placeholder="Trading rules and guidelines for the client..."
                value={drafts[e.id]?.rules ?? ""}
                onChange={(ev) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [e.id]: {
                      accountDetails: prev[e.id]?.accountDetails ?? "",
                      rules: ev.target.value,
                    },
                  }))
                }
                rows={4}
              />
              <Button disabled={saving === e.id} onClick={() => sendSetup(e.id)}>
                Send account & rules to client
              </Button>
            </>
          )}

          {e.status === "active" && e.challengeAccountDetails && (
            <p className="text-sm text-navy-600">Account details already sent.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
