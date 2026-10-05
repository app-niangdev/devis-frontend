import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse, PaginatedResponse } from '../models/tenant.model';
import { User, UserListItem, UserPayload } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  list(perPage: number, search: string, searchRole: string, page = 1): Observable<PaginatedResponse<UserListItem>> {
    const params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage)
      .set('search', search)
      .set('searchRole', searchRole);

    return this.http.get<PaginatedResponse<UserListItem>>(`${this.apiUrl}/list`, { params });
  }

  find(id: number): Observable<ApiItemResponse<User>> {
    return this.http.get<ApiItemResponse<User>>(`${this.apiUrl}/show/${id}`);
  }

  create(payload: UserPayload): Observable<ApiItemResponse<User>> {
    return this.http.post<ApiItemResponse<User>>(`${this.apiUrl}/add`, payload);
  }

  update(id: number, payload: Partial<UserPayload>): Observable<ApiItemResponse<User>> {
    return this.http.put<ApiItemResponse<User>>(`${this.apiUrl}/update/${id}`, payload);
  }

  toggleStatus(id: number): Observable<ApiItemResponse<User>> {
    return this.http.put<ApiItemResponse<User>>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  /** Nouveau mot de passe provisoire : le gestionnaire refera le parcours de première connexion. */
  resetAccess(id: number, password: string): Observable<ApiItemResponse<User>> {
    return this.http.post<ApiItemResponse<User>>(`${this.apiUrl}/reset-access/${id}`, { password });
  }

  forceDelete(id: number): Observable<ApiItemResponse<null>> {
    return this.http.delete<ApiItemResponse<null>>(`${this.apiUrl}/destroy/${id}/force`);
  }
}
