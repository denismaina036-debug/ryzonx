"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MegaPayAdminConfig } from "@/services/payment-provider-config.service";

export function MegaPaySettingsCard({ initialConfig, preview = false }: { initialConfig: MegaPayAdminConfig; preview?: boolean }) {
  const [config, setConfig] = useState(initialConfig);
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [accountEmail, setAccountEmail] = useState(initialConfig.accountEmail);
  const [kesPerUsd, setKesPerUsd] = useState(String(initialConfig.kesPerUsd ?? ""));
  const [apiKey, setApiKey] = useState("");
  const [initiateUrl, setInitiateUrl] = useState(initialConfig.initiateUrl);
  const [statusUrl, setStatusUrl] = useState(initialConfig.statusUrl);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(String(initialConfig.requestTimeoutMs));
  const [merchantDisplayName, setMerchantDisplayName] = useState(initialConfig.merchantDisplayName);
  const [webhookRegistered, setWebhookRegistered] = useState(initialConfig.webhookRegistered);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftReady = Boolean(
    enabled &&
    (config.apiKeyConfigured || apiKey.trim()) &&
    accountEmail.trim() &&
    kesPerUsd &&
    config.encryptionConfigured &&
    webhookRegistered &&
    merchantDisplayName.trim()
  );

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-providers/megapay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          accountEmail,
          kesPerUsd: kesPerUsd.trim() ? Number(kesPerUsd) : null,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          initiateUrl,
          statusUrl,
          requestTimeoutMs: Number(requestTimeoutMs),
          merchantDisplayName,
          webhookRegistered,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Save failed.");
      setConfig(body as MegaPayAdminConfig);
      setApiKey("");
      setShowKey(false);
      toast.success("MegaPay configuration saved securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(config.webhookUrl);
    toast.success("Webhook URL copied.");
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--id-border)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-600" /> MegaPay · M-Pesa</CardTitle>
            <CardDescription className="mt-2">Manage the server-side MegaPay credentials, merchant account, and locked conversion rate.</CardDescription>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--id-text-secondary)]">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Mobile Pay available to clients
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {preview && <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-700">Read-only development preview. Saving is disabled.</div>}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-[var(--id-text)]">API key is write-only and encrypted</p>
              <p className="mt-1 text-xs leading-5 text-[var(--id-text-muted)]">
                {config.apiKeyConfigured ? `A key ending in ••••${config.apiKeyLastFour ?? ""} is configured from ${config.source}.` : "No API key is configured."} The full value is never returned to this screen or written to audit logs.
              </p>
            </div>
          </div>
        </div>

        {!config.encryptionConfigured && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">Set PAYMENT_CONFIG_ENCRYPTION_KEY on the server before saving a key.</div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="megapay-email" required>MegaPay merchant-login email</Label>
            <Input id="megapay-email" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="payments@ryvonx.com" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="megapay-rate" required>KES per USD</Label>
            <Input id="megapay-rate" type="number" min="0.000001" step="0.000001" value={kesPerUsd} onChange={(event) => setKesPerUsd(event.target.value)} placeholder="130" />
            <p className="text-xs text-[var(--id-text-muted)]">This rate is snapshotted and locked on every payment intent.</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--id-text)]">MegaPay webhook receiver</p>
              <p className="mt-1 text-xs text-[var(--id-text-muted)]">Register this exact URL in the MegaPay dashboard. Ryvonx verifies callbacks using the transaction-status API before crediting funds.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyWebhook()}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          </div>
          <code className="mt-3 block break-all rounded-lg bg-[var(--id-surface)] px-3 py-2 font-mono text-xs text-[var(--id-text-secondary)]">{config.webhookUrl}</code>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--id-text-secondary)]">
            <input type="checkbox" checked={webhookRegistered} onChange={(event) => setWebhookRegistered(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
            I have registered this webhook URL in MegaPay
          </label>
        </div>

        <details className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--id-text)]"><Settings2 className="h-4 w-4" /> Advanced provider settings</summary>
          <div className="grid gap-5 border-t border-[var(--id-border)] p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="megapay-initiate-url" required>STK initiation endpoint</Label>
              <Input id="megapay-initiate-url" type="url" value={initiateUrl} onChange={(event) => setInitiateUrl(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="megapay-status-url" required>Transaction-status endpoint</Label>
              <Input id="megapay-status-url" type="url" value={statusUrl} onChange={(event) => setStatusUrl(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapay-timeout" required>Request timeout (milliseconds)</Label>
              <Input id="megapay-timeout" type="number" min="5000" max="60000" step="1000" value={requestTimeoutMs} onChange={(event) => setRequestTimeoutMs(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapay-merchant-name" required>Expected M-Pesa merchant name</Label>
              <Input id="megapay-merchant-name" value={merchantDisplayName} onChange={(event) => setMerchantDisplayName(event.target.value)} placeholder="RYVONX" />
              <p className="text-xs text-[var(--id-text-muted)]">The actual phone prompt name comes from the Till/Paybill linked in MegaPay.</p>
            </div>
          </div>
        </details>

        <div className="rounded-xl border border-[var(--id-border)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold text-[var(--id-text)]">Integration readiness</p><p className="mt-1 text-xs text-[var(--id-text-muted)]">All items must be complete before enabling production deposits.</p></div>
            <span className={draftReady ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-amber-600"}>{draftReady ? "Ready" : "Setup required"}</span>
          </div>
          <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            {[
              [config.apiKeyConfigured, "API key configured"],
              [Boolean(accountEmail), "Merchant email configured"],
              [Boolean(kesPerUsd), "KES conversion rate configured"],
              [config.encryptionConfigured, "Server encryption configured"],
              [webhookRegistered, "Webhook registered in MegaPay"],
              [merchantDisplayName.toUpperCase() === "RYVONX", "Merchant name expected as RYVONX"],
            ].map(([complete, label]) => <li key={String(label)} className="flex items-center gap-2 text-[var(--id-text-secondary)]"><CheckCircle2 className={complete ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-[var(--id-text-faint)]"} />{label}</li>)}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="megapay-api-key">{config.apiKeyConfigured ? "Replace MegaPay API key" : "MegaPay API key"}</Label>
          <div className="relative">
            <Input id="megapay-api-key" type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={config.apiKeyConfigured ? "Leave blank to keep the current key" : "Enter API key"} autoComplete="new-password" className="pr-12" />
            <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--id-text-muted)] hover:text-[var(--id-text)]" aria-label={showKey ? "Hide API key" : "Show API key"}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          <p className="text-xs text-[var(--id-text-muted)]">Saving a new value rotates the key immediately. Existing in-flight payment references remain valid.</p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--id-border)] pt-5">
          <p className="text-xs text-[var(--id-text-faint)]">{config.updatedAt ? `Last updated ${new Date(config.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : "Using rollout configuration"}</p>
          <Button type="button" onClick={() => void save()} disabled={preview || saving || !initiateUrl || !statusUrl || !requestTimeoutMs || !merchantDisplayName.trim() || (enabled && (!accountEmail.trim() || !kesPerUsd || !webhookRegistered || (!config.apiKeyConfigured && !apiKey.trim())))}>{saving ? "Saving…" : "Save MegaPay Settings"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
