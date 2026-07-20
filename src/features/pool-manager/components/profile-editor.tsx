"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileAvatarUpload } from "@/features/investor/components/profile-avatar-upload";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import {
  pmCardElevatedClass,
  pmEyebrowClass,
  pmInputClass,
  pmPrimaryButtonClass,
  pmReadOnlyClass,
  pmSecondaryButtonClass,
  pmSubtitleClass,
  pmTextareaClass,
} from "@/features/pool-manager/constants/ui";
import {
  PM_SOCIAL_PLATFORMS,
  formatPublicUsername,
  normalizePoolManagerUsername,
  type PmSocialLinks,
} from "@/domain/pool-manager/public-profile";
import { cn } from "@/lib/utils";

export interface PoolManagerProfileEditorData {
  fullName: string;
  username: string;
  slug: string;
  showFullName: boolean;
  avatarUrl: string | null;
  bio: string;
  tradingStyle: string;
  markets: string;
  socialLinks: PmSocialLinks;
}

export function PoolManagerProfileEditor({ initial }: { initial: PoolManagerProfileEditorData }) {
  const router = useRouter();
  const [username, setUsername] = useState(initial.username);
  const [showFullName, setShowFullName] = useState(initial.showFullName);
  const [bio, setBio] = useState(initial.bio);
  const [tradingStyle, setTradingStyle] = useState(initial.tradingStyle);
  const [markets, setMarkets] = useState(initial.markets);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [socialLinks, setSocialLinks] = useState<PmSocialLinks>(initial.socialLinks);
  const [loading, setLoading] = useState(false);

  const normalizedUsername = useMemo(() => normalizePoolManagerUsername(username), [username]);
  const publicPreview = formatPublicUsername(normalizedUsername || initial.slug);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/pool-manager/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          showFullName,
          bio,
          tradingStyle,
          markets: markets.split(",").map((s) => s.trim()).filter(Boolean),
          socialLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <section className={cn(pmCardElevatedClass, "p-5 sm:p-6")}>
        <ProfileAvatarUpload
          name={initial.fullName}
          avatarUrl={avatarUrl}
          onUploaded={setAvatarUrl}
        />

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <PmFormField
            label="Username"
            hint="3–30 characters. Letters, numbers, hyphens, underscores."
            required
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--id-text-muted)]">
                @
              </span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))}
                className={cn(pmInputClass, "pl-8")}
                placeholder="your-handle"
              />
            </div>
          </PmFormField>

          <PmFormField label="Legal name" hint="From your account. Not editable here.">
            <div className={pmReadOnlyClass}>{initial.fullName}</div>
          </PmFormField>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3">
          <input
            type="checkbox"
            checked={showFullName}
            onChange={(e) => setShowFullName(e.target.checked)}
            className="mt-0.5 rounded border-[var(--id-border)] accent-[var(--pm-accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--id-text)]">
              Show full name publicly
            </span>
            <span className="mt-0.5 block text-xs text-[var(--id-text-secondary)]">
              When enabled, {initial.fullName} appears under {publicPreview} on your manager profile and pools.
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3 text-sm">
          <span className="text-[var(--id-text-secondary)]">Public preview:</span>
          <span className="font-semibold text-[var(--id-text)]">{publicPreview}</span>
          {showFullName && (
            <span className="text-[var(--id-text-muted)]">· {initial.fullName}</span>
          )}
          <Link
            href={`/managers/${normalizedUsername || initial.slug}`}
            target="_blank"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--pm-accent-text)] hover:underline"
          >
            View profile
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className={cn(pmCardElevatedClass, "p-5 sm:p-6")}>
        <p className={pmEyebrowClass}>About</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--id-text)]">Trading profile</h2>
        <p className={pmSubtitleClass}>Help investors understand your approach.</p>

        <div className="mt-6 space-y-5">
          <PmFormField label="Biography">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className={pmTextareaClass}
              placeholder="Share your experience, philosophy, and what investors can expect…"
            />
          </PmFormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <PmFormField label="Trading style">
              <Input
                value={tradingStyle}
                onChange={(e) => setTradingStyle(e.target.value)}
                className={pmInputClass}
                placeholder="e.g. Day trading, swing, scalping"
              />
            </PmFormField>
            <PmFormField label="Markets" hint="Comma-separated">
              <Input
                value={markets}
                onChange={(e) => setMarkets(e.target.value)}
                className={pmInputClass}
                placeholder="Forex, Indices, Crypto"
              />
            </PmFormField>
          </div>
        </div>
      </section>

      <section className={cn(pmCardElevatedClass, "p-5 sm:p-6")}>
        <p className={pmEyebrowClass}>Social</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--id-text)]">Social links</h2>
        <p className={pmSubtitleClass}>
          Add links to your channels. Only platforms marked “Show publicly” appear on your manager page.
        </p>

        <div className="mt-6 space-y-4">
          {PM_SOCIAL_PLATFORMS.map((platform) => {
            const entry = socialLinks[platform.key];
            return (
              <div
                key={platform.key}
                className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--id-text)]">{platform.label}</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--id-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={entry?.isPublic ?? false}
                      disabled={!entry?.url?.trim()}
                      onChange={(e) =>
                        setSocialLinks((prev) => ({
                          ...prev,
                          [platform.key]: {
                            url: prev[platform.key]?.url ?? "",
                            isPublic: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-[var(--id-border)] accent-[var(--pm-accent)]"
                    />
                    Show publicly
                  </label>
                </div>
                <Input
                  value={entry?.url ?? ""}
                  onChange={(e) =>
                    setSocialLinks((prev) => ({
                      ...prev,
                      [platform.key]: {
                        url: e.target.value,
                        isPublic: e.target.value.trim() ? (prev[platform.key]?.isPublic ?? false) : false,
                      },
                    }))
                  }
                  className={cn(pmInputClass, "mt-3")}
                  placeholder={platform.placeholder}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()} disabled={loading} className={pmPrimaryButtonClass}>
          {loading ? "Saving…" : "Save profile"}
        </Button>
        <Button variant="outline" asChild className={pmSecondaryButtonClass}>
          <Link href={ROUTES.poolManager}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
