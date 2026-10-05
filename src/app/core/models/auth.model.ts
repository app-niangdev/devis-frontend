export interface Menu {
  id: number;
  code: string;
  title: string;
  type: string;
  classes: string;
  url: string;
  icon: string;
  breadcrumbs: boolean;
  position: number;
}

export type SubscriptionState = 'active' | 'expiring' | 'expired' | 'none';

export interface SubscriptionStatus {
  tenant_id: number;
  tenant_name: string;
  state: SubscriptionState;
  plan: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_left: number | null;
}

export interface TenantBranding {
  name: string;
  short_name: string | null;
  slogan: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

/** Profil renvoyé par /auth/me et à la connexion. */
export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string;
  phone_display: string | null;
  phone_two: string | null;
  address: string | null;
  role: 'ADMIN' | 'MANAGER' | string;
  tenant: TenantBranding | null;
  subscription: SubscriptionStatus | null;
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthSession {
  step: 'authenticated';
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
  user: AuthUser;
  menus: Menu[];
}

/** Étape OTP (gestionnaires uniquement : application mobile). */
export interface OtpStep {
  step: 'otp_required';
  purpose: string;
  challenge_token: string;
}

export interface ApiEnvelope<T> {
  status: number;
  message: string;
  payload: T;
  error_code?: string;
}

export type LoginResponse = ApiEnvelope<AuthSession | OtpStep>;
export type RefreshResponse = ApiEnvelope<AuthSession>;
export type MeResponse = ApiEnvelope<AuthUser>;

export interface ApiMessageResponse {
  status?: number;
  message: string;
  payload?: unknown;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Gestionnaire'
};
