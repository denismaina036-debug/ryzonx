export {
  POOL_LIFECYCLE_STATUS,
  type PoolLifecycleStatus,
} from "@/domain/pool-manager/types";

export const POOL_LIFECYCLE_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  live: "Live",
  paused: "Paused",
  restricted: "Restricted",
  closed: "Closed",
  archived: "Archived",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const PM_EDITABLE_LIFECYCLE_STATUSES = ["draft"] as const;

export const PM_SUBMITTABLE_FROM = "draft" as const;
