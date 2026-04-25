// Shared plan/tier configuration. Mirrors the frontend src/lib/planConfig.ts.
// One copy lives here so resolvers can apply quotas without bundling FE code.

export type PlanKey = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  maxRooms: number; // Number.MAX_SAFE_INTEGER == "unlimited"
  integrationsEnabled: boolean;
  priceUsd: number;
  trialDays?: number;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  trial:      { maxRooms: 3,  integrationsEnabled: false, priceUsd: 0,   trialDays: 14 },
  basic:      { maxRooms: 10, integrationsEnabled: false, priceUsd: 35 },
  pro:        { maxRooms: 30, integrationsEnabled: true,  priceUsd: 58 },
  enterprise: { maxRooms: Number.MAX_SAFE_INTEGER, integrationsEnabled: true, priceUsd: 120 },
};

export function isValidPlan(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PLANS;
}
