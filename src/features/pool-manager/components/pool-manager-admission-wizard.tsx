"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Trophy,
  Zap,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { PM_STATUS_LABELS } from "@/features/pool-manager/constants/nav";
import {
  ADMISSION_WIZARD_STEPS,
  MAX_DRAWDOWN_OPTIONS,
  RISK_PER_TRADE_OPTIONS,
  TRADE_DURATION_OPTIONS,
  TRADING_EXPERIENCE_OPTIONS,
} from "@/features/pool-manager/constants/admission-form";
import { ReferenceMultiSelect } from "@/components/reference-data/reference-multi-select";
import { ReferenceInstrumentMultiSelect } from "@/components/reference-data/reference-instrument-multi-select";
import { ReferenceCountryPicker } from "@/components/reference-data/reference-country-picker";
import { SearchableCombobox } from "@/components/reference-data/searchable-combobox";
import { useReferenceData } from "@/hooks/use-reference-data";
import { REFERENCE_SET_KEYS } from "@/domain/reference-data/set-keys";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
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
  investorCardClass,
  investorInputClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PM_APPLICATION_SECTIONS,
  PM_APPLICATION_STATUS,
  PM_ADMISSION_PATH,
  type PoolManagerApplication,
  type PoolManagerApplicationData,
  type PoolManagerApplicationStatus,
  type PoolManagerAdmissionPath,
} from "@/domain/pool-manager/types";
import { resolveCountry } from "@/constants/countries";
import { countryCodeToFlag } from "@/lib/country-flag";
import type { PmAdmissionSettings } from "@/domain/pool-manager/admission-settings";
import type { AdmissionPaymentState } from "@/domain/pool-manager/admission-errors";
import {
  normalizeProfessionalBackground,
  formatTradingInstruments,
} from "@/domain/pool-manager/professional-background";

interface PoolManagerAdmissionWizardProps {
  userRole: string;
  initialApplication: PoolManagerApplication | null;
  initialSettings: PmAdmissionSettings;
  registrationCountry?: string | null;
}

const PENDING_STATUSES: ReadonlySet<PoolManagerApplicationStatus> = new Set([
  PM_APPLICATION_STATUS.PENDING,
  PM_APPLICATION_STATUS.UNDER_REVIEW,
  PM_APPLICATION_STATUS.INTERVIEW_REQUIRED,
]);

const EMPTY_DATA: PoolManagerApplicationData = {};

export function PoolManagerAdmissionWizard({
  userRole,
  initialApplication,
  initialSettings,
  registrationCountry,
}: PoolManagerAdmissionWizardProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [settings] = useState(initialSettings);
  const [step, setStep] = useState(
    Math.min(
      initialApplication?.currentStage ?? PM_APPLICATION_SECTIONS.PROFESSIONAL_BACKGROUND,
      PM_APPLICATION_SECTIONS.REVIEW
    )
  );
  const [formData, setFormData] = useState<PoolManagerApplicationData>(() => {
    const base = initialApplication?.applicationData ?? EMPTY_DATA;
    const normalized = {
      ...base,
      professionalBackground: normalizeProfessionalBackground(base.professionalBackground),
    };

    if (
      registrationCountry &&
      !normalized.professionalBackground?.countryOfResidence
    ) {
      normalized.professionalBackground = {
        ...normalized.professionalBackground,
        countryOfResidence: registrationCountry,
      };
    }

    return normalized;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<AdmissionPaymentState | null>(null);

  const isPoolManager = userRole === USER_ROLES.POOL_MANAGER;
  const isApproved = application?.status === PM_APPLICATION_STATUS.APPROVED;
  const isPending = application?.status != null && PENDING_STATUSES.has(application.status);
  const isRejected = application?.status === PM_APPLICATION_STATUS.REJECTED;
  const canEdit =
    !application ||
    application.status === PM_APPLICATION_STATUS.DRAFT ||
    application.status === PM_APPLICATION_STATUS.REQUIRES_CHANGES;

  const startApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/application", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      const loaded = data.application.applicationData ?? {};
      const normalized = {
        ...loaded,
        professionalBackground: normalizeProfessionalBackground(
          loaded.professionalBackground
        ),
      };
      if (
        registrationCountry &&
        !normalized.professionalBackground?.countryOfResidence
      ) {
        normalized.professionalBackground = {
          ...normalized.professionalBackground,
          countryOfResidence: registrationCountry,
        };
      }
      setFormData(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start application");
    } finally {
      setLoading(false);
    }
  }, [registrationCountry]);

  useEffect(() => {
    if (!application && !isPoolManager) {
      void startApplication();
    }
  }, [application, isPoolManager, startApplication]);

  const loadPaymentState = useCallback(async () => {
    try {
      const res = await fetch("/api/pool-manager/application/payment-state");
      const data = await res.json();
      if (res.ok && data.payment) {
        setPaymentState(data.payment as AdmissionPaymentState);
      }
    } catch {
      // Non-blocking — submit endpoint validates balance again
    }
  }, []);

  useEffect(() => {
    if (step === PM_APPLICATION_SECTIONS.REVIEW && canEdit) {
      void loadPaymentState();
    }
  }, [step, canEdit, loadPaymentState, formData.admissionPath]);

  const currentStepMeta = useMemo(
    () => ADMISSION_WIZARD_STEPS.find((s) => s.section === step),
    [step]
  );

  async function saveSection(section: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/application/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data: formData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      setFormData(data.application.applicationData ?? formData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    const ok = await saveSection(step);
    if (ok && step < PM_APPLICATION_SECTIONS.REVIEW) {
      setStep(step + 1);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const sectionOk = await saveSection(PM_APPLICATION_SECTIONS.REVIEW);
      if (!sectionOk) return;

      const res = await fetch("/api/pool-manager/application/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  function selectAdmissionPath(path: PoolManagerAdmissionPath) {
    setFormData((prev) => ({ ...prev, admissionPath: path }));
  }

  if (isPoolManager || isApproved) {
    return (
      <div className={`${investorCardClass} max-w-2xl p-8 text-center`}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className={`${investorPageTitleClass} mt-4`}>You&apos;re a Pool Manager</h1>
        <p className={`${investorPageSubtitleClass} mt-2`}>
          Your workspace is ready. Create strategies, investment cycles, and manage your pools.
        </p>
        <Button asChild className="mt-6">
          <Link href={ROUTES.poolManager}>Open Pool Manager Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (isPending) {
    const pathLabel =
      application?.admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE
        ? "Trading Challenge"
        : application?.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS
          ? "Direct Access"
          : "Pool Manager";

    return (
      <div className={`${investorCardClass} max-w-2xl p-8`}>
        <div className="flex items-start gap-4">
          <Clock className="mt-1 h-8 w-8 shrink-0 text-[var(--id-accent-text)]" />
          <div>
            <h1 className={investorPageTitleClass}>Application under review</h1>
            <p className={`${investorPageSubtitleClass} mt-2`}>
              Status: {PM_STATUS_LABELS[application!.status] ?? application!.status}
            </p>
            <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
              Admission path: <span className="font-medium">{pathLabel}</span>
              {application?.admissionFeeAmount != null && (
                <> · Fee: {formatCurrency(application.admissionFeeAmount)}</>
              )}
              {application?.paymentStatus === "paid" && <> · Paid</>}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--id-text-secondary)]">
              Our team is reviewing your application. You will be notified when there is an update.
            </p>
            {application?.basicInfo.challengeAccountInfo && (
              <div className="mt-6 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  Challenge account details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--id-text)]">
                  {application.basicInfo.challengeAccountInfo}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className={`${investorCardClass} max-w-2xl p-8`}>
        <h1 className={investorPageTitleClass}>Application not approved</h1>
        <p className={`${investorPageSubtitleClass} mt-2`}>
          {application?.adminNotes ?? "Please contact support if you have questions."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--id-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--id-accent-text)]">
          <Shield className="h-3.5 w-3.5" />
          Pool Manager Application
        </div>
        <h1 className={investorPageTitleClass}>Pool Manager Admission</h1>
        <p className={investorPageSubtitleClass}>
          Complete each section to submit your professional evaluation application.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {ADMISSION_WIZARD_STEPS.map((s) => {
          const done = (application?.currentStage ?? 1) > s.section;
          const active = step === s.section;
          return (
            <button
              key={s.section}
              type="button"
              onClick={() => canEdit && s.section <= (application?.currentStage ?? 1) && setStep(s.section)}
              disabled={!canEdit || s.section > (application?.currentStage ?? 1)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-left text-xs transition",
                active && "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
                done && !active && "border-[var(--id-border)] text-[var(--id-text-muted)]",
                !done && !active && "border-[var(--id-border)] text-[var(--id-text-faint)]"
              )}
            >
              <span className="font-semibold">{s.section}. {s.title}</span>
            </button>
          );
        })}
      </nav>

      <div className={`${investorCardClass} space-y-6 p-6 sm:p-8`}>
        {currentStepMeta && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--id-text)]">{currentStepMeta.title}</h2>
            <p className="mt-1 text-sm text-[var(--id-text-muted)]">{currentStepMeta.description}</p>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {step === PM_APPLICATION_SECTIONS.PROFESSIONAL_BACKGROUND && (
          <ProfessionalBackgroundFields formData={formData} setFormData={setFormData} disabled={!canEdit || loading} />
        )}
        {step === PM_APPLICATION_SECTIONS.TRADING_METHODOLOGY && (
          <TradingMethodologyFields formData={formData} setFormData={setFormData} disabled={!canEdit || loading} />
        )}
        {step === PM_APPLICATION_SECTIONS.RISK_MANAGEMENT && (
          <RiskManagementFields formData={formData} setFormData={setFormData} disabled={!canEdit || loading} />
        )}
        {step === PM_APPLICATION_SECTIONS.TRADING_PERFORMANCE && (
          <TradingPerformanceFields formData={formData} setFormData={setFormData} disabled={!canEdit || loading} />
        )}
        {step === PM_APPLICATION_SECTIONS.PERSONAL_STATEMENT && (
          <PersonalStatementFields formData={formData} setFormData={setFormData} disabled={!canEdit || loading} />
        )}
        {step === PM_APPLICATION_SECTIONS.ADMISSION_PATH && (
          <AdmissionPathSection
            formData={formData}
            settings={settings}
            onSelect={selectAdmissionPath}
            disabled={!canEdit || loading}
          />
        )}
        {step === PM_APPLICATION_SECTIONS.REVIEW && (
          <ReviewSection
            formData={formData}
            setFormData={setFormData}
            settings={settings}
            paymentState={paymentState}
            disabled={!canEdit || loading}
          />
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--id-border)] pt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={loading || step <= 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < PM_APPLICATION_SECTIONS.REVIEW ? (
              <Button type="button" disabled={loading} onClick={() => void handleContinue()}>
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : step === PM_APPLICATION_SECTIONS.REVIEW && !paymentState ? (
              <Button type="button" disabled>
                Checking balance…
              </Button>
            ) : paymentState && !paymentState.sufficient && !paymentState.alreadyPaid ? (
              <Button asChild type="button" className="bg-[var(--id-accent)]">
                <Link href={ROUTES.deposits}>
                  Deposit Funds to Continue
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled={loading} onClick={() => void handleSubmit()}>
                {loading
                  ? "Processing…"
                  : paymentState?.fee != null
                    ? `Pay ${formatCurrency(paymentState.fee)} & Submit`
                    : "Submit Application"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type SetForm = React.Dispatch<React.SetStateAction<PoolManagerApplicationData>>;

function ProfessionalBackgroundFields({
  formData,
  setFormData,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  disabled: boolean;
}) {
  const bg = formData.professionalBackground ?? {};
  const { items: marketOptions, loading: marketsLoading } = useReferenceData(
    REFERENCE_SET_KEYS.FINANCIAL_MARKETS
  );
  const normalizedMarkets = normalizeMarketCodes(bg.marketsTraded ?? []);

  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["professionalBackground"]>>) =>
    setFormData((prev) => ({
      ...prev,
      professionalBackground: { ...prev.professionalBackground, ...p },
    }));

  function onMarketsChange(codes: string[]) {
    patch({
      marketsTraded: normalizeMarketCodes(codes),
      primaryTradingInstruments: [],
      primaryTradingInstrument: undefined,
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--id-text-secondary)]">
        Tell us about your experience in the financial markets.
      </p>
      <Field label="Trading Experience *">
        <Select value={bg.tradingExperience ?? ""} onValueChange={(v) => patch({ tradingExperience: v })} disabled={disabled}>
          <SelectTrigger className={investorInputClass}>
            <SelectValue placeholder="Select experience" />
          </SelectTrigger>
          <SelectContent>
            {TRADING_EXPERIENCE_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Markets Traded *">
        <ReferenceMultiSelect
          options={marketOptions}
          value={normalizedMarkets}
          onChange={onMarketsChange}
          disabled={disabled}
          loading={marketsLoading}
        />
      </Field>
      <Field label="Primary Trading Instruments *">
        <ReferenceInstrumentMultiSelect
          marketCodes={normalizedMarkets}
          value={bg.primaryTradingInstruments ?? []}
          onChange={(codes) =>
            patch({
              primaryTradingInstruments: codes,
              primaryTradingInstrument: codes[0],
            })
          }
          disabled={disabled}
        />
      </Field>
      <Field label="Country of Residence *">
        <ReferenceCountryPicker
          value={bg.countryOfResidence}
          onChange={(code) => patch({ countryOfResidence: code })}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function TradingMethodologyFields({
  formData,
  setFormData,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  disabled: boolean;
}) {
  const meth = formData.tradingMethodology ?? {};
  const { items: styleOptions, loading: stylesLoading } = useReferenceData(
    REFERENCE_SET_KEYS.TRADING_STYLES
  );
  const { items: analysisOptions, loading: analysisLoading } = useReferenceData(
    REFERENCE_SET_KEYS.MARKET_ANALYSIS_METHODS
  );

  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["tradingMethodology"]>>) =>
    setFormData((prev) => ({
      ...prev,
      tradingMethodology: { ...prev.tradingMethodology, ...p },
    }));

  const styleComboboxOptions = styleOptions.map((o) => ({
    value: o.code,
    label: o.label,
    keywords: o.searchText,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--id-text-secondary)]">
        Help us understand how you approach the markets.
      </p>
      <Field label="Primary Trading Style *">
        <SearchableCombobox
          options={styleComboboxOptions}
          value={meth.primaryTradingStyle}
          onChange={(v) => patch({ primaryTradingStyle: v })}
          disabled={disabled}
          loading={stylesLoading}
          placeholder="Select style…"
          searchPlaceholder="Search trading styles…"
        />
      </Field>
      <Field label="Average Trade Duration *">
        <Select value={meth.averageTradeDuration ?? ""} onValueChange={(v) => patch({ averageTradeDuration: v })} disabled={disabled}>
          <SelectTrigger className={investorInputClass}><SelectValue placeholder="Select duration" /></SelectTrigger>
          <SelectContent>
            {TRADE_DURATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Describe Your Trading Strategy *">
        <Textarea
          className={investorInputClass}
          rows={5}
          value={meth.tradingStrategy ?? ""}
          onChange={(e) => patch({ tradingStrategy: e.target.value })}
          placeholder="Explain your market analysis, entry criteria, confirmations, trade management and exit strategy."
          disabled={disabled}
        />
      </Field>
      <Field label="Market Analysis Approach *">
        <ReferenceMultiSelect
          options={analysisOptions}
          value={meth.marketAnalysisApproach ?? []}
          onChange={(codes) => patch({ marketAnalysisApproach: codes })}
          disabled={disabled}
          loading={analysisLoading}
        />
      </Field>
    </div>
  );
}

function RiskManagementFields({
  formData,
  setFormData,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  disabled: boolean;
}) {
  const risk = formData.riskManagement ?? {};
  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["riskManagement"]>>) =>
    setFormData((prev) => ({
      ...prev,
      riskManagement: { ...prev.riskManagement, ...p },
    }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--id-text-secondary)]">
        Protecting investor capital is our highest priority.
      </p>
      <Field label="Average Risk Per Trade *">
        <Select value={risk.averageRiskPerTrade ?? ""} onValueChange={(v) => patch({ averageRiskPerTrade: v })} disabled={disabled}>
          <SelectTrigger className={investorInputClass}><SelectValue placeholder="Select risk" /></SelectTrigger>
          <SelectContent>
            {RISK_PER_TRADE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Maximum Drawdown *">
        <Select value={risk.maximumDrawdown ?? ""} onValueChange={(v) => patch({ maximumDrawdown: v })} disabled={disabled}>
          <SelectTrigger className={investorInputClass}><SelectValue placeholder="Select drawdown" /></SelectTrigger>
          <SelectContent>
            {MAX_DRAWDOWN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Describe Your Risk Management Process *">
        <Textarea
          className={investorInputClass}
          rows={4}
          value={risk.riskManagementProcess ?? ""}
          onChange={(e) => patch({ riskManagementProcess: e.target.value })}
          placeholder="Explain position sizing, stop losses, exposure management, portfolio protection and capital preservation."
          disabled={disabled}
        />
      </Field>
      <Field label="Managing Losing Streaks *">
        <Textarea
          className={investorInputClass}
          rows={4}
          value={risk.managingLosingStreaks ?? ""}
          onChange={(e) => patch({ managingLosingStreaks: e.target.value })}
          placeholder="Describe how you manage consecutive losses while maintaining discipline and protecting investor capital."
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function TradingPerformanceFields({
  formData,
  setFormData,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  disabled: boolean;
}) {
  const perf = formData.tradingPerformance ?? {};
  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["tradingPerformance"]>>) =>
    setFormData((prev) => ({
      ...prev,
      tradingPerformance: { ...prev.tradingPerformance, ...p },
    }));

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-[var(--id-text)]">Trading Performance & Track Record</h3>
      <YesNoField
        label="Do you maintain a Trading Journal?"
        value={perf.maintainsTradingJournal}
        onChange={(v) => patch({ maintainsTradingJournal: v })}
        disabled={disabled}
      />
      <YesNoField
        label="Have you traded funded accounts?"
        value={perf.hasTradedFundedAccounts}
        onChange={(v) => patch({ hasTradedFundedAccounts: v })}
        disabled={disabled}
      />
      {perf.hasTradedFundedAccounts && (
        <Field label="Describe your funded trading experience">
          <Textarea
            className={investorInputClass}
            rows={3}
            value={perf.fundedAccountExperience ?? ""}
            onChange={(e) => patch({ fundedAccountExperience: e.target.value })}
            disabled={disabled}
          />
        </Field>
      )}
      <YesNoField
        label="Have you managed investor capital before?"
        value={perf.hasManagedInvestorCapital}
        onChange={(v) => patch({ hasManagedInvestorCapital: v })}
        disabled={disabled}
      />
      {perf.hasManagedInvestorCapital && (
        <Field label="Describe your capital management experience">
          <Textarea
            className={investorInputClass}
            rows={3}
            value={perf.capitalManagementExperience ?? ""}
            onChange={(e) => patch({ capitalManagementExperience: e.target.value })}
            disabled={disabled}
          />
        </Field>
      )}
      <Field label="Average Monthly Return (optional)">
        <Input
          className={investorInputClass}
          value={perf.averageMonthlyReturn ?? ""}
          onChange={(e) => patch({ averageMonthlyReturn: e.target.value })}
          placeholder="e.g. 3–5%"
          disabled={disabled}
        />
      </Field>
      <Field label="Largest Historical Drawdown (optional)">
        <Input
          className={investorInputClass}
          value={perf.largestHistoricalDrawdown ?? ""}
          onChange={(e) => patch({ largestHistoricalDrawdown: e.target.value })}
          placeholder="e.g. 12%"
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function PersonalStatementFields({
  formData,
  setFormData,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  disabled: boolean;
}) {
  const stmt = formData.personalStatement ?? {};
  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["personalStatement"]>>) =>
    setFormData((prev) => ({
      ...prev,
      personalStatement: { ...prev.personalStatement, ...p },
    }));

  return (
    <div className="space-y-6">
      <Field label="Why do you want to become a Pool Manager? *">
        <Textarea className={investorInputClass} rows={4} value={stmt.whyPoolManager ?? ""} onChange={(e) => patch({ whyPoolManager: e.target.value })} disabled={disabled} />
      </Field>
      <Field label="What makes your trading approach different? *">
        <Textarea className={investorInputClass} rows={4} value={stmt.tradingApproachDifference ?? ""} onChange={(e) => patch({ tradingApproachDifference: e.target.value })} disabled={disabled} />
      </Field>
      <Field label="What should investors expect from you? *">
        <Textarea className={investorInputClass} rows={4} value={stmt.investorExpectations ?? ""} onChange={(e) => patch({ investorExpectations: e.target.value })} disabled={disabled} />
      </Field>
    </div>
  );
}

function AdmissionPathSection({
  formData,
  settings,
  onSelect,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  settings: PmAdmissionSettings;
  onSelect: (path: PoolManagerAdmissionPath) => void;
  disabled: boolean;
}) {
  const selected = formData.admissionPath;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--id-text-secondary)]">
        Choose how you wish to qualify as a Pool Manager.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdmissionCard
          icon={Trophy}
          title="Take Trading Challenge"
          price={settings.tradingChallengeFee}
          description="Demonstrate your trading ability through an official RyvonX evaluation challenge."
          requirements={[
            "Complete the evaluation",
            "Maintain a complete Trading Journal",
            "Follow challenge rules",
            "Meet performance objectives",
            "Pass Administrator review",
          ]}
          selected={selected === PM_ADMISSION_PATH.TRADING_CHALLENGE}
          disabled={disabled}
          onChoose={() => onSelect(PM_ADMISSION_PATH.TRADING_CHALLENGE)}
          buttonLabel="Choose Trading Challenge"
        />
        <AdmissionCard
          icon={Zap}
          title="Direct Access"
          price={settings.directAccessFee}
          description="For experienced traders with an established background."
          requirements={[
            "Administrator reviews your application",
            "If approved, become an active Pool Manager",
            "No trading challenge required",
          ]}
          selected={selected === PM_ADMISSION_PATH.DIRECT_ACCESS}
          disabled={disabled}
          onChoose={() => onSelect(PM_ADMISSION_PATH.DIRECT_ACCESS)}
          buttonLabel="Choose Direct Access"
        />
      </div>
    </div>
  );
}

function ReviewSection({
  formData,
  setFormData,
  settings,
  paymentState,
  disabled,
}: {
  formData: PoolManagerApplicationData;
  setFormData: SetForm;
  settings: PmAdmissionSettings;
  paymentState: AdmissionPaymentState | null;
  disabled: boolean;
}) {
  const conf = formData.reviewConfirmations ?? {};
  const patch = (p: Partial<NonNullable<PoolManagerApplicationData["reviewConfirmations"]>>) =>
    setFormData((prev) => ({
      ...prev,
      reviewConfirmations: { ...prev.reviewConfirmations, ...p },
    }));

  const fee =
    formData.admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE
      ? settings.tradingChallengeFee
      : formData.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS
        ? settings.directAccessFee
        : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/50 p-4 text-sm">
        <p className="font-semibold text-[var(--id-text)]">Review Application</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <ReviewItem label="Experience" value={formData.professionalBackground?.tradingExperience} />
          <ReviewItem
            label="Country"
            value={formatCountryReview(formData.professionalBackground?.countryOfResidence)}
          />
          <ReviewItem label="Trading Style" value={formData.tradingMethodology?.primaryTradingStyle} />
          <ReviewItem
            label="Instrument"
            value={formatInstrumentReview(formData.professionalBackground)}
          />
          <ReviewItem
            label="Admission Path"
            value={
              formData.admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE
                ? "Trading Challenge"
                : formData.admissionPath === PM_ADMISSION_PATH.DIRECT_ACCESS
                  ? "Direct Access"
                  : "—"
            }
          />
          {fee != null && <ReviewItem label="Admission Fee" value={formatCurrency(fee)} />}
        </dl>
      </div>

      {paymentState && fee != null && !paymentState.alreadyPaid && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            paymentState.sufficient
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
          )}
        >
          <p className="font-semibold text-[var(--id-text)]">Payment from balance</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <ReviewItem label="Your available balance" value={formatCurrency(paymentState.availableBalance)} />
            <ReviewItem label="Required" value={formatCurrency(fee)} />
          </dl>
          {!paymentState.sufficient && (
            <p className="mt-3 text-xs leading-relaxed text-[var(--id-text-secondary)]">
              Your balance is not enough to pay the admission fee. Deposit funds to your wallet,
              then return here to submit your application.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <ConfirmCheck
          label="Information is accurate"
          checked={conf.informationAccurate ?? false}
          onChange={(v) => patch({ informationAccurate: v })}
          disabled={disabled}
        />
        <ConfirmCheck
          label="Agrees to RyvonX Terms"
          checked={conf.agreesToTerms ?? false}
          onChange={(v) => patch({ agreesToTerms: v })}
          disabled={disabled}
        />
        <ConfirmCheck
          label="Understands approval is not guaranteed"
          checked={conf.understandsNotGuaranteed ?? false}
          onChange={(v) => patch({ understandsNotGuaranteed: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function AdmissionCard({
  icon: Icon,
  title,
  price,
  description,
  requirements,
  selected,
  disabled,
  onChoose,
  buttonLabel,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  price: number;
  description: string;
  requirements: string[];
  selected: boolean;
  disabled: boolean;
  onChoose: () => void;
  buttonLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-5 transition",
        selected
          ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)]/40"
          : "border-[var(--id-border)] bg-[var(--id-surface-muted)]/30"
      )}
    >
      <Icon className="h-6 w-6 text-[var(--id-accent-text)]" strokeWidth={1.75} />
      <h3 className="mt-3 font-semibold text-[var(--id-text)]">{title}</h3>
      <p className="mt-1 text-xl font-bold text-[var(--id-accent-text)]">{formatCurrency(price)}</p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--id-text-secondary)]">{description}</p>
      <ul className="mt-4 flex-1 space-y-1.5 text-xs text-[var(--id-text-muted)]">
        {requirements.map((r) => (
          <li key={r} className="flex gap-2">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--id-accent-text)]" />
            {r}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-5 w-full"
        variant={selected ? "default" : "outline"}
        disabled={disabled}
        onClick={onChoose}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Field label={`${label} *`}>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition",
              value === v
                ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                : "border-[var(--id-border)] text-[var(--id-text-muted)]"
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </Field>
  );
}

function ConfirmCheck({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--id-text)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[var(--id-border)]"
      />
      {label}
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--id-text)]">{value ?? "—"}</dd>
    </div>
  );
}

function formatCountryReview(codeOrName: string | undefined): string | undefined {
  if (!codeOrName) return undefined;
  const country = resolveCountry(codeOrName);
  if (country) return `${countryCodeToFlag(country.code)} ${country.name}`;
  return codeOrName;
}

function formatInstrumentReview(
  bg: PoolManagerApplicationData["professionalBackground"]
): string | undefined {
  return formatTradingInstruments(bg);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--id-text)]">{label}</span>
      {children}
    </label>
  );
}
