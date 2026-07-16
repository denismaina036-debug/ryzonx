"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WalletQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function WalletQrCode({ value, size = 168, className }: WalletQrCodeProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!value.trim()) return null;

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-[var(--id-border)] bg-white p-3 shadow-sm",
        className
      )}
    >
      {mounted ? (
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="#ffffff"
          fgColor={isDark ? "#0a0b10" : "#0f172a"}
          level="M"
          includeMargin={false}
        />
      ) : (
        <div
          className="animate-pulse rounded-lg bg-[var(--id-surface-muted)]"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}
