import { SubscriptionStatus } from './auth.model';

export type DepositType = 'none' | 'percent' | 'amount';

/** Inscription faite depuis l'application : « pending » tant que le numéro n'est pas confirmé. */
export type ApprovalStatus = 'approved' | 'pending';

export interface TenantManager {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_one: string;
  email: string | null;
  status: boolean;
  /** Numéro confirmé par le code WhatsApp */
  phone_verified?: boolean;
}

/** Entreprise (artisan / ouvrier) cliente de la plateforme. */
export interface Tenant {
  id: number;
  name: string;
  code_website: string;
  slogan: string | null;
  description: string | null;
  address: string | null;
  email: string | null;
  trade: string | null;
  ninea: string | null;
  rccm: string | null;
  phone_other: string | null;
  phone_call: string | null;
  phone_whatsapp: string | null;
  logo_url: string | null;
  snap: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_deposit_type: DepositType;
  default_deposit_value: number;
  quote_validity_days: number;
  quote_footer: string | null;
  short_name: string | null;
  state: boolean;
  approval_status: ApprovalStatus;
  /** Date de création (date d'inscription pour une entreprise inscrite depuis l'application) */
  registered_at?: string | null;
  managers?: TenantManager[];
  subscription?: SubscriptionStatus;
}

export interface TenantPayload {
  name: string;
  code_website: string;
  slogan?: string | null;
  description?: string | null;
  address?: string | null;
  email?: string | null;
  trade?: string | null;
  ninea?: string | null;
  rccm?: string | null;
  phone_other?: string | null;
  phone_call?: string | null;
  phone_whatsapp?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  default_deposit_type?: DepositType;
  default_deposit_value?: number;
  quote_validity_days?: number;
  quote_footer?: string | null;
  short_name?: string | null;
  user_id?: number | null;
  logo?: File | null;
  remove_logo?: boolean;
}

export const DEFAULT_COLORS = {
  primary_color: '#00853F',
  secondary_color: '#17202A',
  accent_color: '#FDEF42'
};

export interface PaginatedMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  status: number;
  message: string;
  payload: T[];
  meta: PaginatedMeta;
}

export interface ApiItemResponse<T> {
  status: number;
  message: string;
  payload: T;
}
