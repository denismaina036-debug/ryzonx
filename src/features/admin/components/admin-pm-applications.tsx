"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES, adminChallengeReviewPath } from "@/constants/routes";
import { PM_STATUS_LABELS } from "@/features/pool-manager/constants/nav";
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
import {
  PM_EXPERIENCE_LEVELS,
  PM_RISK_CLASSIFICATIONS,
  type PmExperienceLevel,
  type PmRiskClassification,
} from "@/features/admin/constants/pm-initial-rating";
import { getCountryName, resolveCountry } from "@/constants/countries";
import { countryCodeToFlag } from "@/lib/country-flag";
import { formatTradingInstruments } from "@/domain/pool-manager/professional-background";
import { PM_APPLICATION_STATUS, PM_ADMISSION_PATH, type PoolManagerApplicationStatus } from "@/domain/pool-manager/types";
import type { PoolManagerApplication } from "@/domain/pool-manager/types";
import type { ChallengeTemplate } from "@/domain/challenge/challenge-template";

interface AdminPmApplicationsProps {
  applications: Array<
    PoolManagerApplication & { applicantName: string; applicantEmail: string }
  >;
  challengeTemplates: ChallengeTemplate[];
}

export function AdminPmApplications({
  applications,
  challengeTemplates,
}: AdminPmApplicationsProps) {
  const defaultTemplate =
    challengeTemplates.find((template) => template.isDefault) ?? challengeTemplates[0] ?? null;

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    applications[0]?.id ?? null
  );
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplate?.id ?? "");
  const [broker, setBroker] = useState(defaultTemplate?.defaultBroker ?? "");
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [challengeAccountInfo, setChallengeAccountInfo] = useState("");
  const [initialRating, setInitialRating] = useState("3.5");
  const [displayReviewCount, setDisplayReviewCount] = useState("0");
  const [displayTradeCount, setDisplayTradeCount] = useState("0");
  const [displayInvestorCount, setDisplayInvestorCount] = useState("0");
  const [experienceLevel, setExperienceLevel] = useState<PmExperienceLevel>("intermediate");
  const [riskClassification, setRiskClassification] = useState<PmRiskClassification>("balanced");
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId);
  const selectedTemplate =
    challengeTemplates.find((template) => template.id === templateId) ?? defaultTemplate;

  function selectApplication(id: string) {
    setSelectedId(id);
    const app = applications.find((a) => a.id === id);
    setChallengeAccountInfo(app?.basicInfo.challengeAccountInfo ?? "");
    setTemplateId(app?.challengeTemplateId ?? defaultTemplate?.id ?? "");
    setBroker(
      app?.challengeTemplateId
        ? challengeTemplates.find((template) => template.id === app.challengeTemplateId)
            ?.defaultBroker ?? defaultTemplate?.defaultBroker ?? ""
        : defaultTemplate?.defaultBroker ?? ""
    );
    setNotes("");
    setError(null);
  }

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = challengeTemplates.find((item) => item.id === nextTemplateId);
    if (template && !broker.trim()) {
      setBroker(template.defaultBroker);
    }
  }

  async function patchApplication(body: Record<string, unknown>) {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pool-manager-applications/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveChallengeInfo() {
    await patchApplication({
      templateId,
      broker,
      server,
      login,
      password,
      investorPassword: investorPassword.trim() || undefined,
      challengeAccountInfo,
    });
  }

  async function setStatus(status: PoolManagerApplicationStatus) {
    await patchApplication({
      status,
      notes: notes.trim() || undefined,
      initialRating:
        status === PM_APPLICATION_STATUS.APPROVED
          ? {
              ryvonxRating: Number(initialRating) || 3.5,
              displayReviewCount: Math.max(0, Math.floor(Number(displayReviewCount) || 0)),
              displayTradeCount: Math.max(0, Math.floor(Number(displayTradeCount) || 0)),
              displayInvestorCount: Math.max(0, Math.floor(Number(displayInvestorCount) || 0)),
              experienceLevel,
              riskClassification,
              isVerified,
            }
          : undefined,
    });
    setNotes("");
  }

  async function approveChallenge() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pool-manager-applications/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveChallenge: true,
          templateId,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const isDirectAccess = selected?.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS;
  const isTradingChallenge =
    selected?.admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE ||
    (!selected?.admissionPath && Boolean(selected?.challengeEnrollmentId));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-2 lg:col-span-2">
        {applications.length === 0 ? (
          <p className="text-sm text-navy-500">No applications yet.</p>
        ) : (
          applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => selectApplication(app.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedId === app.id
                  ? "border-royal-500/40 bg-royal-500/10"
                  : "border-navy-100 bg-white hover:border-navy-200"
              }`}
            >
              <p className="font-medium text-navy-900">{app.applicantName}</p>
              <p className="text-xs text-navy-500">{app.applicantEmail}</p>
              <p className="mt-2 text-xs capitalize text-royal-600">
                {PM_STATUS_LABELS[app.status] ?? app.status}
                {app.admissionPath && (
                  <> · {app.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS ? "Direct Access" : "Trading Challenge"}</>
                )}
              </p>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="space-y-6 rounded-xl border border-navy-100 bg-white p-6 lg:col-span-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{selected.applicantName}</h2>
            <p className="text-sm text-navy-500">
              {selected.applicantEmail} · {PM_STATUS_LABELS[selected.status]}
            </p>
            {selected.submittedAt && (
              <p className="mt-1 text-xs text-navy-400">
                Submitted {new Date(selected.submittedAt).toLocaleString()}
              </p>
            )}
          </div>

          <section>
            <h3 className="text-sm font-semibold text-navy-800">Application Details</h3>
            {selected.admissionPath && (
              <p className="mt-2 text-sm text-navy-600">
                Admission path:{" "}
                <span className="font-medium">
                  {selected.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS
                    ? "Direct Access"
                    : "Trading Challenge"}
                </span>
                {selected.admissionFeeAmount != null && (
                  <> · Fee: ${selected.admissionFeeAmount}</>
                )}
              </p>
            )}
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Experience"
                value={
                  selected.applicationData.professionalBackground?.tradingExperience ??
                  selected.basicInfo.tradingExperience
                }
              />
              <Item
                label="Country"
                value={formatAdminCountry(
                  selected.applicationData.professionalBackground?.countryOfResidence ??
                    selected.basicInfo.country
                )}
              />
              <Item
                label="Style"
                value={
                  selected.applicationData.tradingMethodology?.primaryTradingStyle ??
                  selected.basicInfo.tradingStyle
                }
              />
              <Item
                label="Instrument"
                value={formatAdminInstrument(selected.applicationData.professionalBackground)}
              />
            </dl>
            {(selected.applicationData.personalStatement?.whyPoolManager ??
              selected.basicInfo.biography) && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-navy-600">
                {selected.applicationData.personalStatement?.whyPoolManager ??
                  selected.basicInfo.biography}
              </p>
            )}
          </section>

          {isTradingChallenge && (
          <section className="space-y-3 border-t border-navy-100 pt-6">
            <h3 className="text-sm font-semibold text-navy-800">Challenge Assignment</h3>
            <p className="text-xs text-navy-500">
              Select a challenge template and assign account credentials. All evaluation rules load
              automatically from the template.
            </p>
            <Field label="Challenge Template">
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select challenge template" />
                </SelectTrigger>
                <SelectContent>
                  {challengeTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedTemplate && (
              <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm text-navy-700">
                <p className="font-medium text-navy-900">{selectedTemplate.name}</p>
                <p className="mt-1 text-xs text-navy-500">{selectedTemplate.description}</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SummaryItem
                    label="Starting Balance"
                    value={`$${selectedTemplate.startingBalance.toLocaleString()} ${selectedTemplate.currency}`}
                  />
                  <SummaryItem label="Platform" value={selectedTemplate.platform} />
                  <SummaryItem label="Profit Target" value={`${selectedTemplate.profitTargetPct}%`} />
                  <SummaryItem
                    label="Max Drawdown"
                    value={`${selectedTemplate.maxOverallDrawdownPct}%`}
                  />
                  <SummaryItem
                    label="Min Trading Days"
                    value={String(selectedTemplate.minTradingDays)}
                  />
                  <SummaryItem
                    label="Min Closed Trades"
                    value={String(selectedTemplate.minClosedTrades)}
                  />
                </dl>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Broker">
                <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker name" />
              </Field>
              <Field label="Server">
                <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Server" />
              </Field>
              <Field label="Login Number">
                <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Account login" />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Account password"
                />
              </Field>
              <Field label="Investor Password (optional)">
                <Input
                  type="password"
                  value={investorPassword}
                  onChange={(e) => setInvestorPassword(e.target.value)}
                  placeholder="Investor password"
                />
              </Field>
            </div>
            <Field label="Additional Notes (optional)">
              <Textarea
                placeholder="Optional notes for the applicant…"
                value={challengeAccountInfo}
                onChange={(e) => setChallengeAccountInfo(e.target.value)}
                rows={3}
              />
            </Field>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void saveChallengeInfo()}
              disabled={
                loading ||
                !templateId ||
                !broker.trim() ||
                !server.trim() ||
                !login.trim() ||
                !password.trim()
              }
            >
              Assign Challenge Account
            </Button>
            {selected.challengeEnrollmentId && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={adminChallengeReviewPath(selected.challengeEnrollmentId)}>
                  Open Challenge Review
                </Link>
              </Button>
            )}
          </section>
          )}

          <section className="space-y-4 border-t border-navy-100 pt-6">
            <h3 className="text-sm font-semibold text-navy-800">Public Display Metrics</h3>
            <p className="text-xs text-navy-500">
              Set every visible marketplace stat before approval — rating, reviews, trades, and investor count.
              Live platform data replaces these baselines once it exceeds the values you enter.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Overall Rating (0–5)">
                <Input type="number" min={0} max={5} step="0.1" value={initialRating} onChange={(e) => setInitialRating(e.target.value)} />
              </Field>
              <Field label="Review Count">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={displayReviewCount}
                  onChange={(e) => setDisplayReviewCount(e.target.value)}
                  placeholder="From funded-account reviews"
                />
              </Field>
              <Field label="Trade Count">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={displayTradeCount}
                  onChange={(e) => setDisplayTradeCount(e.target.value)}
                  placeholder="Verified trades on record"
                />
              </Field>
              <Field label="Initial Investors">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={displayInvestorCount}
                  onChange={(e) => setDisplayInvestorCount(e.target.value)}
                  placeholder="Baseline investor count"
                />
              </Field>
              <Field label="Experience Level">
                <Select
                  value={experienceLevel}
                  onValueChange={(value) => setExperienceLevel(value as PmExperienceLevel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PM_EXPERIENCE_LEVELS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Risk Classification">
                <Select
                  value={riskClassification}
                  onValueChange={(value) => setRiskClassification(value as PmRiskClassification)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {PM_RISK_CLASSIFICATIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
              Verification badge
            </label>
          </section>

          <section className="space-y-4 border-t border-navy-100 pt-6">
            <h3 className="text-sm font-semibold text-navy-800">Review Actions</h3>
            <p className="text-xs text-navy-500">
              {isDirectAccess
                ? "Direct Access applicants can be approved immediately after review."
                : "Trading Challenge applicants must pass the challenge before final Pool Manager approval."}
            </p>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Textarea
              placeholder="Internal review notes (included with status notifications)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-3">
              {isTradingChallenge &&
                selected.status === PM_APPLICATION_STATUS.PENDING && (
                  <Button
                    onClick={() => void approveChallenge()}
                    disabled={loading || !templateId}
                  >
                    Approve Challenge
                  </Button>
                )}
              <Button
                onClick={() => void setStatus(PM_APPLICATION_STATUS.APPROVED)}
                disabled={
                  loading ||
                  selected.status === PM_APPLICATION_STATUS.APPROVED ||
                  (isTradingChallenge && !isDirectAccess && selected.status !== PM_APPLICATION_STATUS.UNDER_REVIEW)
                }
              >
                Approve Pool Manager
              </Button>
              <Button
                variant="outline"
                onClick={() => void setStatus(PM_APPLICATION_STATUS.REJECTED)}
                disabled={loading}
              >
                Reject
              </Button>
              <Button
                variant="ghost"
                onClick={() => void setStatus(PM_APPLICATION_STATUS.REQUIRES_CHANGES)}
                disabled={loading}
              >
                Suspend / Request Changes
              </Button>
            </div>
            {selected.status === PM_APPLICATION_STATUS.APPROVED && (
              <Button variant="outline" asChild>
                <Link href={ROUTES.poolManager}>View PM Dashboard</Link>
              </Button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-navy-500">{label}</dt>
      <dd className="font-medium text-navy-800">{value ?? "—"}</dd>
    </div>
  );
}

function formatAdminCountry(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const country = resolveCountry(value);
  if (country) return `${countryCodeToFlag(country.code)} ${country.name}`;
  return getCountryName(value) ?? value;
}

function formatAdminInstrument(
  bg: PoolManagerApplication["applicationData"]["professionalBackground"]
): string | undefined {
  return formatTradingInstruments(bg);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-navy-500">{label}</dt>
      <dd className="font-medium text-navy-800">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-navy-600">{label}</span>
      {children}
    </label>
  );
}
