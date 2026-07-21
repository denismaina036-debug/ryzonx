import { USER_ROLES, type UserRole } from "@/constants/roles";
import {
  REGISTRATION_INTENTS,
  isRegistrationIntent,
  type RegistrationIntent,
} from "@/constants/registration";

export type PmJourneyCardVariant = "hidden" | "become" | "continue";

export function resolvePmJourneyCardVariant(input: {
  role: UserRole;
  registrationIntent?: RegistrationIntent | string | null;
  hasStartedApplication?: boolean;
}): PmJourneyCardVariant {
  if (
    input.role === USER_ROLES.POOL_MANAGER ||
    input.role === USER_ROLES.ADMINISTRATOR
  ) {
    return "hidden";
  }

  if (input.role === USER_ROLES.POOL_MANAGER_APPLICANT || input.hasStartedApplication) {
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
