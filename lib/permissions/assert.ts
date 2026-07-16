import type { Capability, MemberRole } from "@/types/domain";
import { can } from "@/lib/permissions/capabilities";

export class PermissionError extends Error {
  readonly role: MemberRole;
  readonly capability: Capability;

  constructor(role: MemberRole, capability: Capability) {
    super(`Role "${role}" lacks capability "${capability}"`);
    this.name = "PermissionError";
    this.role = role;
    this.capability = capability;
  }
}

export function assertCan(role: MemberRole, capability: Capability): void {
  if (!can(role, capability)) {
    throw new PermissionError(role, capability);
  }
}
