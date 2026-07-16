"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";

interface SearchResults {
  communications: Array<Record<string, unknown>>;
  templates: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  broadcasts: Array<Record<string, unknown>>;
}

export function AdminCommunicationSearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/communication/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 350);
    return () => clearTimeout(timer);
  }, [query, search]);

  const sections = results
    ? [
        { title: "Communications", items: results.communications, href: ROUTES.adminCommunicationOutbox },
        { title: "Templates", items: results.templates, href: ROUTES.adminCommunicationTemplates },
        { title: "Support tickets", items: results.tickets, href: ROUTES.adminCommunicationSupport },
        { title: "Broadcasts", items: results.broadcasts, href: ROUTES.adminCommunicationBroadcasts },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipient, email, template, ticket, broadcast, communication ID…"
          className="h-12 pl-12 text-base"
          autoFocus
        />
      </div>

      {loading && <p className="text-sm text-navy-400">Searching…</p>}

      {!loading && results && (
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-800">{section.title}</h3>
                <Link href={section.href} className="text-xs text-royal-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {section.items.length === 0 ? (
                  <li className="text-xs text-navy-400">No matches</li>
                ) : (
                  section.items.map((item) => (
                    <li key={String(item.id)} className="rounded-lg bg-navy-50 px-3 py-2 text-xs">
                      <p className="font-medium text-navy-800">
                        {String(item.name ?? item.rendered_subject ?? item.subject ?? item.slug ?? item.id)}
                      </p>
                      <p className="text-navy-400">
                        {String(item.status ?? item.category ?? "")}
                        {item.created_at ? ` · ${new Date(String(item.created_at)).toLocaleDateString()}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
