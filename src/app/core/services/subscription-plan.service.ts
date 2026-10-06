import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse } from '../models/tenant.model';
import { SubscriptionPlan, SubscriptionPlanPayload } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPlanService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/subscription-plans`;

  list(activeOnly = false): Observable<ApiItemResponse<SubscriptionPlan[]>> {
    const params = activeOnly ? new HttpParams().set('active_only', 1) : undefined;
    return this.http.get<ApiItemResponse<SubscriptionPlan[]>>(`${this.apiUrl}/list`, { params });
  }

  create(payload: SubscriptionPlanPayload): Observable<ApiItemResponse<SubscriptionPlan>> {
    return this.http.post<ApiItemResponse<SubscriptionPlan>>(`${this.apiUrl}/add`, payload);
  }

  update(id: number, payload: SubscriptionPlanPayload): Observable<ApiItemResponse<SubscriptionPlan>> {
    return this.http.put<ApiItemResponse<SubscriptionPlan>>(`${this.apiUrl}/update/${id}`, payload);
  }

  toggleStatus(id: number): Observable<ApiItemResponse<SubscriptionPlan>> {
    return this.http.put<ApiItemResponse<SubscriptionPlan>>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  delete(id: number): Observable<ApiItemResponse<null>> {
    return this.http.delete<ApiItemResponse<null>>(`${this.apiUrl}/delete/${id}`);
  }
}
