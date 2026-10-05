import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse } from '../models/tenant.model';
import {
  Subscription,
  SubscriptionOverviewResponse,
  SubscriptionPayload,
  TenantSubscriptions
} from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/subscriptions`;

  overview(page: number, perPage: number, search: string, state: string): Observable<SubscriptionOverviewResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage)
      .set('search', search)
      .set('state', state);

    return this.http.get<SubscriptionOverviewResponse>(`${this.apiUrl}/overview`, { params });
  }

  forTenant(tenantId: number): Observable<ApiItemResponse<TenantSubscriptions>> {
    return this.http.get<ApiItemResponse<TenantSubscriptions>>(`${this.apiUrl}/tenant/${tenantId}`);
  }

  create(payload: SubscriptionPayload): Observable<ApiItemResponse<Subscription>> {
    return this.http.post<ApiItemResponse<Subscription>>(`${this.apiUrl}/add`, payload);
  }

  update(id: number, payload: SubscriptionPayload): Observable<ApiItemResponse<Subscription>> {
    return this.http.put<ApiItemResponse<Subscription>>(`${this.apiUrl}/update/${id}`, payload);
  }

  delete(id: number): Observable<ApiItemResponse<null>> {
    return this.http.delete<ApiItemResponse<null>>(`${this.apiUrl}/delete/${id}`);
  }
}
