"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Monitor,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMAIL_BUILDER_BLOCKS, TEMPLATE_VARIABLE_GROUPS } from "@/constants/communication-center";
import type { EmailBlock } from "@/services/communication/email/types";
import { cn } from "@/lib/utils";

type BuilderBlock = EmailBlock & { id: string };

function newBlock(type: string): BuilderBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "title":
      return { id, type: "paragraph", text: "{{title}}" } as BuilderBlock;
    case "subtitle":
      return { id, type: "paragraph", text: "{{subtitle}}" } as BuilderBlock;
    case "paragraph":
      return { id, type: "paragraph", text: "Enter your message here…" };
    case "info_card":
      return { id, type: "info_card", label: "Label", value: "{{value}}" };
    case "metric_row":
      return { id, type: "metric_row", items: [{ label: "Metric", value: "{{amount}}" }] };
    case "alert":
      return { id, type: "alert", variant: "info", text: "Important notice" };
    case "timeline":
      return { id, type: "timeline", items: [{ label: "Step 1", value: "Details" }] };
    case "badge":
      return { id, type: "badge", label: "Status", variant: "info" };
    case "divider":
      return { id, type: "divider" };
    case "primary_button":
      return { id, type: "paragraph", text: "[ Primary Button — {{dashboard_link}} ]" };
    case "secondary_button":
      return { id, type: "paragraph", text: "[ Secondary Button ]" };
    case "header":
    case "logo":
    case "footer":
      return { id, type: "html", content: `<!-- ${type} block -->` };
    default:
      return { id, type: "paragraph", text: "Content block" };
  }
}

function blockLabel(block: BuilderBlock): string {
  if (block.type === "paragraph") return block.text.slice(0, 40);
  if (block.type === "info_card") return `${block.label}: ${block.value}`;
  if (block.type === "alert") return block.text.slice(0, 40);
  return block.type;
}

export function EmailBuilderView() {
  const [blocks, setBlocks] = useState<BuilderBlock[]>([
    { id: "1", type: "paragraph", text: "Hello {{first_name}}," },
  ]);
  const [title, setTitle] = useState("Email title");
  const [intro, setIntro] = useState("Your message intro…");
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selected = blocks.find((b) => b.id === selectedId);

  const insertVariable = useCallback(
    (variable: string) => {
      if (!selected || selected.type !== "paragraph") return;
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === selectedId && b.type === "paragraph"
            ? { ...b, text: `${b.text}{{${variable}}}` }
            : b
        )
      );
    },
    [selected, selectedId]
  );

  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= blocks.length) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const a = copy[index];
      const b = copy[next];
      if (!a || !b) return prev;
      copy[index] = b;
      copy[next] = a;
      return copy;
    });
  };

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      if (!moved) return prev;
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDragIndex(null);
  };

  const previewHtml = useMemo(() => {
    const body = blocks
      .map((b) => {
        if (b.type === "paragraph") return `<p style="margin:0 0 12px;color:#334155;">${b.text}</p>`;
        if (b.type === "info_card")
          return `<div style="background:#f8fafc;padding:12px;border-radius:8px;margin:0 0 12px;"><strong>${b.label}</strong><br/>${b.value}</div>`;
        if (b.type === "alert")
          return `<div style="background:#eff6ff;padding:12px;border-radius:8px;margin:0 0 12px;">${b.text}</div>`;
        if (b.type === "divider") return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />`;
        if (b.type === "html") return b.content;
        return `<p style="color:#64748b;font-size:12px;">[${b.type}]</p>`;
      })
      .join("");
    return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;"><h1 style="font-size:22px;color:#0f172a;">${title}</h1><p style="color:#475569;">${intro}</p>${body}</div>`;
  }, [blocks, title, intro]);

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_1fr_240px]">
      <aside className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-400">Blocks</h3>
        <ul className="mt-3 space-y-1">
          {EMAIL_BUILDER_BLOCKS.map((b) => (
            <li key={b.type}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-navy-700 hover:bg-navy-50"
                onClick={() => setBlocks((prev) => [...prev, newBlock(b.type)])}
              >
                + {b.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Email title" />
          <Input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Intro paragraph" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-400">Canvas</h3>
          <ul className="mt-3 space-y-2">
            {blocks.map((block, index) => (
              <li
                key={block.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-grab",
                  selectedId === block.id ? "border-royal-300 bg-royal-50" : "border-border bg-white"
                )}
                onClick={() => setSelectedId(block.id)}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-navy-300" />
                <span className="flex-1 truncate">{blockLabel(block)}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => moveBlock(index, -1)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => moveBlock(index, 1)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-400">Preview</h3>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant={viewport === "desktop" ? "default" : "outline"} onClick={() => setViewport("desktop")}>
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant={viewport === "mobile" ? "default" : "outline"} onClick={() => setViewport("mobile")}>
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className={cn(
              "mt-3 w-full rounded-lg border border-border bg-white",
              viewport === "mobile" ? "max-w-[375px] mx-auto h-[480px]" : "h-[420px]"
            )}
          />
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-400">Variables</h3>
        <p className="mt-1 text-xs text-navy-500">Click to insert into selected paragraph block.</p>
        <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto">
          {Object.entries(TEMPLATE_VARIABLE_GROUPS).map(([group, vars]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-navy-600">{group}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {vars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded bg-navy-50 px-2 py-0.5 font-mono text-[10px] text-royal-700 hover:bg-royal-50"
                    onClick={() => insertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
