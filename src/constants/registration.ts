export const REGISTRATION_INTENTS = {
  JOIN_POOL: "join-pool",
  CREATE_POOL: "create-pool",
} as const;

export type RegistrationIntent =
  (typeof REGISTRATION_INTENTS)[keyof typeof REGISTRATION_INTENTS];

export function isRegistrationIntent(
  value: string | null | undefined
): value is RegistrationIntent {
  return (
    value === REGISTRATION_INTENTS.JOIN_POOL ||
    value === REGISTRATION_INTENTS.CREATE_POOL
  );
}

export function registerRoute(intent: RegistrationIntent): string {
  return `/register?intent=${intent}`;
}
