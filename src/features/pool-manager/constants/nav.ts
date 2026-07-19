import {

  LayoutDashboard,

  Landmark,

  BookOpen,

  LineChart,
  Layers,
  Wallet,

  UserCircle,

  Settings,

  type LucideIcon,

} from "lucide-react";

import { ROUTES } from "@/constants/routes";



export interface PoolManagerNavItem {

  label: string;

  href: string;

  icon: LucideIcon;

}



/** Primary workspace navigation — Pool-centric */

export const POOL_MANAGER_NAV_ITEMS: PoolManagerNavItem[] = [

  { label: "Dashboard", href: ROUTES.poolManager, icon: LayoutDashboard },

  { label: "My Pools", href: ROUTES.poolManagerPools, icon: Landmark },
  { label: "Strategies", href: ROUTES.poolManagerStrategies, icon: Layers },

  { label: "Journal", href: ROUTES.poolManagerJournal, icon: BookOpen },

  { label: "Performance", href: ROUTES.poolManagerPerformance, icon: LineChart },

  { label: "Finance", href: ROUTES.poolManagerFinance, icon: Wallet },

  { label: "Profile", href: ROUTES.poolManagerProfile, icon: UserCircle },

  { label: "Settings", href: ROUTES.poolManagerSettings, icon: Settings },

];



/** Internal routes retained for direct links (journal, admin) */

export const POOL_MANAGER_LEGACY_NAV_ITEMS: PoolManagerNavItem[] = [];



export const PM_APPLICATION_STEPS = [

  { stage: 1, title: "Basic Information", description: "Your trading background" },

  { stage: 2, title: "Trader Challenge", description: "Prove your skill" },

  { stage: 3, title: "Pool Proposal", description: "Your first pool plan" },

  { stage: 4, title: "Admin Review", description: "RyvonX evaluation" },

  { stage: 5, title: "Activation", description: "Unlock your dashboard" },

] as const;



export const PM_STATUS_LABELS: Record<string, string> = {

  draft: "Draft",

  pending: "Pending Review",

  under_review: "Under Review",

  requires_changes: "Requires Changes",

  interview_required: "Interview Required",

  approved: "Approved",

  rejected: "Rejected",

};


