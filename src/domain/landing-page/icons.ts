import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Crown,
  Landmark,
  LineChart,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LandingStatIcon } from "@/domain/landing-page/types";

const ICON_MAP: Record<LandingStatIcon, LucideIcon> = {
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Activity,
  Wallet,
  Crown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  LineChart,
  Shield,
};

export function resolveLandingIcon(name: LandingStatIcon | string): LucideIcon {
  return ICON_MAP[name as LandingStatIcon] ?? BarChart3;
}
