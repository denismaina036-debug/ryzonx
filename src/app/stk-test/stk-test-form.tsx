"use client";

import { FormEvent, useState } from "react";

type Result = {
  ok: boolean;
  status: number;
  data: unknown;
};

export function StkTestForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/stk-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          amount: form.get("amount"),
          msisdn: form.get("msisdn"),
          reference: form.get("reference"),
        }),
      });

      const data = await response.json().catch(() => ({ error: "The server returned invalid JSON." }));
      setResult({ ok: response.ok, status: response.status, data });
    } catch (error) {
      setResult({
        ok: false,
        status: 0,
        data: { error: error instanceof Error ? error.message : "Request failed" },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <form className="space-y-5" onSubmit={submit}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" />
        <Field label="Amount (KES)" name="amount" type="number" placeholder="1" min="1" step="1" />
        <Field label="M-Pesa number" name="msisdn" type="tel" placeholder="0712345678" />
        <Field
          label="Reference"
          name="reference"
          type="text"
          placeholder="stk-test-001"
          defaultValue={`stk-test-${Date.now()}`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send test STK push"}
        </button>
      </form>

      {result && (
        <div className="mt-6" aria-live="polite">
          <p className={result.ok ? "text-sm font-semibold text-emerald-400" : "text-sm font-semibold text-red-400"}>
            {result.ok ? "Request accepted" : "Request failed"} {result.status ? `(HTTP ${result.status})` : ""}
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}

function Field(props: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  defaultValue?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {props.label}
      <input
        {...props}
        required
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500"
      />
    </label>
  );
}
