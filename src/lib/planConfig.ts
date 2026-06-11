// Frontend mirror of elysia-server/planConfig.ts. Single source of truth for the four plan
// tiers' room caps, integration access, and pricing. Changing any value here should be
// matched on the backend so quota enforcement stays in sync.

export type PlanKey = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  maxRooms: number;             // Number.MAX_SAFE_INTEGER means "unlimited"
  integrationsEnabled: boolean;
  priceUsd: number;
  trialDays?: number;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  trial:      { maxRooms: 3,  integrationsEnabled: false, priceUsd: 0,   trialDays: 14 },
  basic:      { maxRooms: 10, integrationsEnabled: false, priceUsd: 40 },
  pro:        { maxRooms: 30, integrationsEnabled: true,  priceUsd: 90 },
  enterprise: { maxRooms: Number.MAX_SAFE_INTEGER, integrationsEnabled: true, priceUsd: 140 },
};

export const PLAN_ORDER: PlanKey[] = ['trial', 'basic', 'pro', 'enterprise'];

export function isUnlimited(maxRooms: number) {
  return maxRooms >= 999 || maxRooms === Number.MAX_SAFE_INTEGER;
}
