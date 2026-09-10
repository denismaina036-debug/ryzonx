"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AdminInvestorDirectoryRow } from "@/services/admin-directory.service";

export function InvestorsTable({ investors }: { investors: AdminInvestorDirectoryRow[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <Table className="min-w-[800px]">
    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Total Investments</TableHead><TableHead>Pool Investments</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
    <TableBody>
      {!investors.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-navy-500">No active investors found.</TableCell></TableRow>}
      {investors.map(inv => <TableRow key={inv.profile.id}>
        <TableCell className="align-top"><p className="font-medium text-navy-950">{inv.profile.full_name}</p><span className="mt-1 inline-block text-xs text-emerald-700">Active</span>{selected === inv.profile.id && <p className="mt-2 break-all text-xs text-navy-500">Account ID: {inv.profile.id}</p>}</TableCell>
        <TableCell className="max-w-xs break-all align-top text-navy-600">{inv.profile.email}</TableCell>
        <TableCell className="align-top font-medium tabular-nums">{inv.totals.length ? inv.totals.map(total => <p key={total.currency} className="whitespace-nowrap">{formatCurrency(total.capital, { currency: total.currency })}</p>) : formatCurrency(0)}</TableCell>
        <TableCell className="min-w-[280px] align-top">{inv.pools.length ? <ul className="divide-y divide-border">{inv.pools.map(pool => <li key={`${pool.fundId}:${pool.currency}`} className="flex items-start justify-between gap-5 py-2 first:pt-0 last:pb-0"><span className="text-navy-700">{pool.name}</span><span className="whitespace-nowrap font-medium tabular-nums">{formatCurrency(pool.capital, { currency: pool.currency })}</span></li>)}</ul> : <span className="text-navy-500">No current pool investments</span>}</TableCell>
        <TableCell className="text-right align-top"><Button size="sm" variant="outline" aria-expanded={selected === inv.profile.id} onClick={() => setSelected(selected === inv.profile.id ? null : inv.profile.id)}>{selected === inv.profile.id ? "Hide" : "View"}</Button></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}
