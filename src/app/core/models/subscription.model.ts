import { SubscriptionState, SubscriptionStatus } from './auth.model';
import { PaginatedMeta } from './tenant.model';

export interface Subscription {
  id: number;
  tenant_id: number;
  plan: string;
  amount: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_by: number | null;
  creator?: { id: number; first_name: string; last_name: string } | null;
  created_at: string;
}

export interface SubscriptionPayload {
  tenant_id: number;
  plan: string;
  amount: number;
  currency?: string;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
}

export interface SubscriptionOverviewItem extends SubscriptionStatus {
  tenant_active: boolean;
}

export interface SubscriptionOverviewResponse {
  status: number;
  message: string;
  payload: SubscriptionOverviewItem[];
  meta: PaginatedMeta;
  counts: Record<SubscriptionState, number>;
}

export interface TenantSubscriptions {
  status: SubscriptionStatus;
  subscriptions: Subscription[];
}
