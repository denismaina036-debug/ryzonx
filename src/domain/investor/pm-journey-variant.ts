import { USER_ROLES, type UserRole } from "@/constants/roles";
import {
  REGISTRATION_INTENTS,
  isRegistrationIntent,
  type RegistrationIntent,
} from "@/constants/registration";
import {
  PM_APPLICATION_STATUS,
  type PoolManagerApplicationStatus,
} from "@/domain/pool-manager/types";

export type PmJourneyCardVariant = "hidden" | "become" | "continue";

export function resolvePmJourneyCardVariant(input: {
  role: UserRole;
  registrationIntent?: RegistrationIntent | string | null;
  hasStartedApplication?: boolean;
  applicationStatus?: PoolManagerApplicationStatus | string | null;
}): PmJourneyCardVariant {
  if (
    input.role === USER_ROLES.POOL_MANAGER ||
    input.role === USER_ROLES.ADMINISTRATOR
  ) {
    return "hidden";
  }

  if (input.applicationStatus === PM_APPLICATION_STATUS.REJECTED) {
    return "hidden";
  }

  const inProgressApplication =
    input.applicationStatus === PM_APPLICATION_STATUS.DRAFT ||
    input.applicationStatus === PM_APPLICATION_STATUS.REQUIRES_CHANGES ||
    input.applicationStatus === PM_APPLICATION_STATUS.PENDING ||
    input.applicationStatus === PM_APPLICATION_STATUS.UNDER_REVIEW ||
    input.applicationStatus === PM_APPLICATION_STATUS.INTERVIEW_REQUIRED;

  if (input.role === USER_ROLES.POOL_MANAGER_APPLICANT || inProgressApplication) {
    return "continue";
  }

  if (input.hasStartedApplication && input.applicationStatus !== PM_APPLICATION_STATUS.APPROVED) {
    return "continue";
  }

  if (input.registrationIntent === REGISTRATION_INTENTS.CREATE_POOL) {
    return "continue";
  }

  return "become";
}

export function parseRegistrationIntent(
  value: unknown
): RegistrationIntent | null {
  return typeof value === "string" && isRegistrationIntent(value) ? value : null;
}

export function pmJourneyCardTitle(variant: PmJourneyCardVariant): string {
  if (variant === "continue") return "Continue Pool Manager Journey";
  return "Become a Pool Manager";
}

export function pmJourneyCardCta(variant: PmJourneyCardVariant): string {
  if (variant === "continue") return "Continue Journey";
  return "Apply Now";
}
