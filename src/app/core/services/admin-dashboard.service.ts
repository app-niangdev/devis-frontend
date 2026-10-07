import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse } from '../models/tenant.model';
import { SubscriptionState, SubscriptionStatus } from '../models/auth.model';

export interface QuoteBucket {
  count: number;
  total: number;
}

export interface TenantStats {
  tenant_id: number;
  tenant_name: string;
  tenant_active: boolean;
  accepted: QuoteBucket;
  refused: QuoteBucket;
  /** Brouillons et devis envoyés sans réponse */
  pending: QuoteBucket;
  /** Acomptes encaissés sur les devis acceptés (FCFA) */
  collected: number;
}

export interface AdminDashboard {
  tenants: { total: number; active: number };
  managers: number;
  /** Inscriptions depuis l'application à valider (numéro confirmé) */
  pending_signups: number;
  subscriptions: Record<SubscriptionState, number>;
  revenue_month: number;
  quotes_month: number;
  attention: (SubscriptionStatus & { tenant_active: boolean })[];
  tenant_stats: TenantStats[];
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<ApiItemResponse<AdminDashboard>> {
    return this.http.get<ApiItemResponse<AdminDashboard>>(`${environment.apiUrl}/admin/dashboard`);
  }
}
