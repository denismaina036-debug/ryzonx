import { PM_APPLICATION_STATUS, type PoolManagerApplicationStatus } from "@/domain/pool-manager/types";
import type { PoolManagerApplicationFilter } from "@/constants/routes";

const PENDING_STATUSES: PoolManagerApplicationStatus[] = [
  PM_APPLICATION_STATUS.DRAFT,
  PM_APPLICATION_STATUS.PENDING,
  PM_APPLICATION_STATUS.UNDER_REVIEW,
  PM_APPLICATION_STATUS.REQUIRES_CHANGES,
  PM_APPLICATION_STATUS.INTERVIEW_REQUIRED,
];

export function filterPoolManagerApplications<T extends { status: PoolManagerApplicationStatus }>(
  applications: T[],
  filter: PoolManagerApplicationFilter
): T[] {
  if (filter === "all") return applications;
  if (filter === "approved") {
    return applications.filter((a) => a.status === PM_APPLICATION_STATUS.APPROVED);
  }
  if (filter === "rejected") {
    return applications.filter((a) => a.status === PM_APPLICATION_STATUS.REJECTED);
  }
  return applications.filter((a) => PENDING_STATUSES.includes(a.status));
}

export function countPoolManagerApplicationsByFilter<T extends { status: PoolManagerApplicationStatus }>(
  applications: T[]
): Record<PoolManagerApplicationFilter, number> {
  return {
    pending: filterPoolManagerApplications(applications, "pending").length,
    approved: filterPoolManagerApplications(applications, "approved").length,
    rejected: filterPoolManagerApplications(applications, "rejected").length,
    all: applications.length,
  };
}
