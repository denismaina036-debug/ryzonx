import { notFound } from "next/navigation";
import Link from "next/link";
import { StkTestForm } from "./stk-test-form";

export default function StkTestPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STK_TEST_PAGE !== "true") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Local sandbox tool
        </p>
        <h1 className="text-3xl font-bold">M-Pesa STK Push Test</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Submit a test request through the Ryvonx server. Use MegaPay sandbox credentials and
          a phone you control. The API key is never sent to this page.
        </p>

        <StkTestForm />
        <Link
          href="/mobile-pay-preview"
          className="mt-5 inline-flex text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Preview the full Ryvonx Mobile Pay experience →
        </Link>
      </div>
    </main>
  );
}
