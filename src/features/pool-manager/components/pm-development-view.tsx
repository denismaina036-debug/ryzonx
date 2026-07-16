"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MANAGER_LEVEL_LABELS } from "@/constants/capital-allocation";
import { CONTENT_TYPE_LABELS } from "@/constants/capital-allocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PmDevelopmentViewProps {
  summary: {
    managerLevel: string;
    achievements: Array<{ title: string; awardedAt: string }>;
    nextLevel: string | null;
    promotionRequirements: string[];
  };
}

export function PmDevelopmentView({ summary }: PmDevelopmentViewProps) {
  const [contentType, setContentType] = useState("pool_update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitContent() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/pool-manager/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, title, body }),
      });
      if (!res.ok) throw new Error("Submit failed");
      toast.success("Submitted for RyvonX approval");
      setTitle("");
      setBody("");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-navy-900">Career Progression</h2>
        <p className="mt-2 text-sm text-royal-600">
          {MANAGER_LEVEL_LABELS[summary.managerLevel] ?? summary.managerLevel}
        </p>
        {summary.nextLevel && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-navy-500">
              Next: {MANAGER_LEVEL_LABELS[summary.nextLevel]}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-navy-600">
              {summary.promotionRequirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-navy-900">Achievements</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.achievements.map((a) => (
            <span key={a.title} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              {a.title}
            </span>
          ))}
          {summary.achievements.length === 0 && (
            <p className="text-sm text-navy-500">No achievements awarded yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Submit Content for Approval</h2>
        <p className="text-xs text-navy-500">
          Pool updates, commentary, and reports require administrator approval before publication.
        </p>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Content" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <Button disabled={submitting || !title || !body} onClick={submitContent}>
          Submit for approval
        </Button>
      </section>
    </div>
  );
}
