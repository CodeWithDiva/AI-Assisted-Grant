import type { OrgRole } from '../enums';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  type: string;
  role: OrgRole;
}
