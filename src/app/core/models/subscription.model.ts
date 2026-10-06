import { SubscriptionState, SubscriptionStatus } from './auth.model';
import { PaginatedMeta } from './tenant.model';

export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  position: number;
  subscriptions_count?: number;
}

/** Création : tous les champs. Modification : nom, description et ordre seulement. */
export interface SubscriptionPlanPayload {
  name: string;
  description?: string | null;
  position?: number | null;
  duration_months?: number;
  price?: number;
}

export interface Subscription {
  id: number;
  tenant_id: number;
  subscription_plan_id: number | null;
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

/** Avec un forfait, la fin et le montant sont calculés par l'API ; `ends_at` sert aux abonnements sans forfait. */
export interface SubscriptionPayload {
  tenant_id: number;
  subscription_plan_id: number | null;
  starts_at: string;
  ends_at?: string;
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
