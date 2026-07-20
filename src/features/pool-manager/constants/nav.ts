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
  { stage: 1, title: "Professional Background", description: "Your market experience" },
  { stage: 2, title: "Trading Methodology", description: "How you approach markets" },
  { stage: 3, title: "Risk Management", description: "Capital protection" },
  { stage: 4, title: "Trading Performance", description: "Track record" },
  { stage: 5, title: "Personal Statement", description: "Your motivation" },
  { stage: 6, title: "Admission Path", description: "Challenge or direct access" },
  { stage: 7, title: "Review", description: "Confirm and submit" },
  { stage: 8, title: "Admin Review", description: "RyvonX evaluation" },
  { stage: 9, title: "Activation", description: "Unlock your dashboard" },
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


