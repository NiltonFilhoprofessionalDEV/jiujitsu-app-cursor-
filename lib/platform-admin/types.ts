import type { MemberRole, MemberStatus } from "@/types/domain";

export type PlatformAdminActionState = {
  error?: string;
  success?: string;
} | null;

export type PlatformAcademyListItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  email: string | null;
  isActive: boolean;
  suspensionReason: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
};

export type PlatformAcademyDetails = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  description: string | null;
  timezone: string;
  isActive: boolean;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformMemberRow = {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  name: string | null;
  email: string | null;
  joinedAt: string | null;
};
