import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse } from '../models/tenant.model';
import { SubscriptionState, SubscriptionStatus } from '../models/auth.model';

export interface AdminDashboard {
  tenants: { total: number; active: number };
  managers: number;
  subscriptions: Record<SubscriptionState, number>;
  revenue_month: number;
  quotes_month: number;
  attention: (SubscriptionStatus & { tenant_active: boolean })[];
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<ApiItemResponse<AdminDashboard>> {
    return this.http.get<ApiItemResponse<AdminDashboard>>(`${environment.apiUrl}/admin/dashboard`);
  }
}
