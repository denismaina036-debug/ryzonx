export const MANAGED_POOL_RETURN_MODELS = ["fixed", "variable"] as const;

export type ManagedPoolReturnModel = (typeof MANAGED_POOL_RETURN_MODELS)[number];

export const MANAGED_POOL_RETURN_MODEL_LABELS: Record<ManagedPoolReturnModel, string> = {
  fixed: "Fixed Return on Investment",
  variable: "Variable Return",
};
