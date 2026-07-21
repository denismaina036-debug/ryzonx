"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REGISTRATION_INTENTS, registerRoute } from "@/constants/registration";

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GetStartedModal({ open, onOpenChange }: GetStartedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Get Started</DialogTitle>
          <DialogDescription>
            Choose how you want to begin on RyvonX.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-3">
          <Link
            href={registerRoute(REGISTRATION_INTENTS.JOIN_POOL)}
            onClick={() => onOpenChange(false)}
            className="group flex items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:border-royal-200 hover:bg-royal-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-navy-950">
                Join Pool
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-1 block text-sm text-navy-500">
                Create an account and start investing in a pool.
              </span>
            </span>
          </Link>

          <Link
            href={registerRoute(REGISTRATION_INTENTS.CREATE_POOL)}
            onClick={() => onOpenChange(false)}
            className="group flex items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:border-royal-200 hover:bg-royal-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-navy-950">
                Create Pool
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-1 block text-sm text-navy-500">
                Create an account and start managing investor capital.
              </span>
            </span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
