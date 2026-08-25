import { notFound } from "next/navigation";
import { MegaPaySettingsCard } from "@/features/admin/components/megapay-settings-card";

export default function ProviderSettingsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-[var(--id-page)] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--id-accent-text)]">Administrator preview</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--id-text)]">Global Settings</h1>
          <p className="mt-2 text-sm text-[var(--id-text-muted)]">Configure company branding, regional settings, and payment integrations.</p>
        </div>
        <MegaPaySettingsCard
          preview
          initialConfig={{
            enabled: true,
            accountEmail: "payments@ryvonx.com",
            kesPerUsd: 130,
            apiKeyConfigured: true,
            apiKeyLastFour: "6IXT",
            source: "database",
            encryptionConfigured: true,
            initiateUrl: "https://megapay.co.ke/backend/v1/initiatestk",
            statusUrl: "https://megapay.co.ke/backend/v1/transactionstatus",
            requestTimeoutMs: 20000,
            merchantDisplayName: "RYVONX",
            webhookRegistered: true,
            webhookUrl: "https://ryvonx.com/api/webhooks/megapay",
            ready: true,
            updatedAt: new Date().toISOString(),
          }}
        />
      </div>
    </main>
  );
}
