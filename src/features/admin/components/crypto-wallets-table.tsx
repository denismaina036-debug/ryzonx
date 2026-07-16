"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from "@/components/ui/table";

import { WalletQrCode } from "@/features/investor/components/crypto-flow/wallet-qr-code";
import type { Tables } from "@/types/database.types";

type CryptoWallet = Tables<"crypto_deposit_wallets">;



export function CryptoWalletsTable({ wallets }: { wallets: CryptoWallet[] }) {

  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftAddress, setDraftAddress] = useState("");

  const [draftMin, setDraftMin] = useState("");

  const [showAdd, setShowAdd] = useState(false);

  const [adding, setAdding] = useState(false);

  const [newWallet, setNewWallet] = useState({

    symbol: "",

    name: "",

    networkCode: "",

    networkLabel: "",

    walletAddress: "",

    minDeposit: "20",

    iconColor: "#627d98",

  });



  function startEdit(wallet: CryptoWallet) {

    setEditingId(wallet.id);

    setDraftAddress(wallet.wallet_address);

    setDraftMin(String(wallet.min_deposit));

  }



  function saveEdit(id: string) {

    const parsedMin = Number(draftMin);

    if (!draftAddress.trim() || !Number.isFinite(parsedMin)) {

      toast.error("Enter a valid address and minimum deposit");

      return;

    }



    fetch("/api/admin/crypto-wallets", {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        id,

        walletAddress: draftAddress.trim(),

        minDeposit: parsedMin,

      }),

    })

      .then(async (res) => {

        const body = await res.json();

        if (!res.ok) throw new Error(body.error ?? "Update failed");

        toast.success("Wallet updated");

        setEditingId(null);

        router.refresh();

      })

      .catch((err) => {

        toast.error(err instanceof Error ? err.message : "Update failed");

      });

  }



  async function handleAdd() {

    const parsedMin = Number(newWallet.minDeposit);

    if (

      !newWallet.symbol.trim() ||

      !newWallet.name.trim() ||

      !newWallet.networkCode.trim() ||

      !newWallet.networkLabel.trim() ||

      !newWallet.walletAddress.trim() ||

      !Number.isFinite(parsedMin)

    ) {

      toast.error("Fill in all wallet fields");

      return;

    }



    setAdding(true);

    try {

      const res = await fetch("/api/admin/crypto-wallets", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          symbol: newWallet.symbol.trim(),

          name: newWallet.name.trim(),

          networkCode: newWallet.networkCode.trim(),

          networkLabel: newWallet.networkLabel.trim(),

          walletAddress: newWallet.walletAddress.trim(),

          minDeposit: parsedMin,

          iconColor: newWallet.iconColor,

        }),

      });

      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Create failed");



      toast.success("Wallet added");

      setShowAdd(false);

      setNewWallet({

        symbol: "",

        name: "",

        networkCode: "",

        networkLabel: "",

        walletAddress: "",

        minDeposit: "20",

        iconColor: "#627d98",

      });

      router.refresh();

    } catch (err) {

      toast.error(err instanceof Error ? err.message : "Create failed");

    } finally {

      setAdding(false);

    }

  }



  return (

    <div className="space-y-4">

      <div className="flex justify-end">

        <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>

          <Plus className="h-4 w-4" />

          Add Wallet

        </Button>

      </div>



      {showAdd && (

        <div className="rounded-lg border border-navy-200 bg-white p-4">

          <h3 className="mb-3 text-sm font-semibold text-navy-950">New crypto wallet</h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <Input

              placeholder="Symbol (e.g. USDT)"

              value={newWallet.symbol}

              onChange={(e) =>

                setNewWallet((w) => ({ ...w, symbol: e.target.value }))

              }

            />

            <Input

              placeholder="Name (e.g. Tether)"

              value={newWallet.name}

              onChange={(e) => setNewWallet((w) => ({ ...w, name: e.target.value }))}

            />

            <Input

              placeholder="Network code (e.g. TRC20)"

              value={newWallet.networkCode}

              onChange={(e) =>

                setNewWallet((w) => ({ ...w, networkCode: e.target.value }))

              }

            />

            <Input

              placeholder="Network label"

              value={newWallet.networkLabel}

              onChange={(e) =>

                setNewWallet((w) => ({ ...w, networkLabel: e.target.value }))

              }

            />

            <Input

              placeholder="Wallet address"

              value={newWallet.walletAddress}

              onChange={(e) =>

                setNewWallet((w) => ({ ...w, walletAddress: e.target.value }))

              }

              className="sm:col-span-2"

            />

            {newWallet.walletAddress.trim() && (
              <div className="flex flex-col items-start gap-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-navy-600">Address preview</p>
                <WalletQrCode value={newWallet.walletAddress.trim()} size={140} />
              </div>
            )}

            <Input

              type="number"

              placeholder="Min deposit"

              value={newWallet.minDeposit}

              onChange={(e) =>

                setNewWallet((w) => ({ ...w, minDeposit: e.target.value }))

              }

            />

          </div>

          <div className="mt-3 flex gap-2">

            <Button size="sm" disabled={adding} onClick={handleAdd}>

              {adding ? "Adding…" : "Save wallet"}

            </Button>

            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>

              Cancel

            </Button>

          </div>

        </div>

      )}



      <Table>

        <TableHeader>

          <TableRow>

            <TableHead>Coin</TableHead>

            <TableHead>Network</TableHead>

            <TableHead>Wallet Address</TableHead>

            <TableHead>Min Deposit</TableHead>

            <TableHead>Status</TableHead>

            <TableHead className="text-right">Actions</TableHead>

          </TableRow>

        </TableHeader>

        <TableBody>

          {wallets.map((w) => (

            <TableRow key={w.id}>

              <TableCell>

                <div className="flex items-center gap-2">

                  <span

                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"

                    style={{ backgroundColor: w.icon_color }}

                  >

                    {w.symbol.charAt(0)}

                  </span>

                  <div>

                    <p className="font-medium">{w.symbol}</p>

                    <p className="text-xs text-navy-500">{w.name}</p>

                  </div>

                </div>

              </TableCell>

              <TableCell className="text-sm">{w.network_label}</TableCell>

              <TableCell className="max-w-xs">

                {editingId === w.id ? (

                  <div className="space-y-3">
                    <Input

                      value={draftAddress}

                      onChange={(e) => setDraftAddress(e.target.value)}

                      className="font-mono text-xs"

                    />
                    {draftAddress.trim() && (
                      <WalletQrCode value={draftAddress.trim()} size={120} />
                    )}
                  </div>

                ) : (

                  <p className="truncate font-mono text-xs">{w.wallet_address}</p>

                )}

              </TableCell>

              <TableCell>

                {editingId === w.id ? (

                  <Input

                    type="number"

                    step="any"

                    value={draftMin}

                    onChange={(e) => setDraftMin(e.target.value)}

                    className="w-24"

                  />

                ) : (

                  <span className="font-mono text-sm">

                    {w.min_deposit} {w.symbol}

                  </span>

                )}

              </TableCell>

              <TableCell>

                <span

                  className={w.is_active ? "text-emerald-600" : "text-navy-400"}

                >

                  {w.is_active ? "Active" : "Inactive"}

                </span>

              </TableCell>

              <TableCell className="text-right">

                {editingId === w.id ? (

                  <div className="flex justify-end gap-2">

                    <Button size="sm" onClick={() => saveEdit(w.id)}>

                      Save

                    </Button>

                    <Button

                      size="sm"

                      variant="ghost"

                      onClick={() => setEditingId(null)}

                    >

                      Cancel

                    </Button>

                  </div>

                ) : (

                  <Button size="sm" variant="outline" onClick={() => startEdit(w)}>

                    Edit

                  </Button>

                )}

              </TableCell>

            </TableRow>

          ))}

        </TableBody>

      </Table>

    </div>

  );

}

