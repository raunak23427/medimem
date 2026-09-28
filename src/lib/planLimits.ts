// Plan-tier gating. Free users can only manage 2 family members; Family /
// Annual plan unlocks up to 6. The numbers match the pricing tiers shown in
// SettingsPage and the original spec.

import type { UserProfile, FamilyMember } from '../types';

export const PLAN_MEMBER_LIMIT: Record<UserProfile['plan'], number> = {
  free: 2,
  family: 6,
  annual: 6,
};

export interface MemberSlotState {
  used: number;
  limit: number;
  canAdd: boolean;
  remaining: number;
  isAtLimit: boolean;
}

export function getMemberSlotState(profile: UserProfile, members: FamilyMember[]): MemberSlotState {
  const limit = PLAN_MEMBER_LIMIT[profile.plan] ?? PLAN_MEMBER_LIMIT.free;
  const used = members.length;
  return {
    used, limit,
    remaining: Math.max(0, limit - used),
    canAdd: used < limit,
    isAtLimit: used >= limit,
  };
}
