import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import {
  ApiMessageResponse,
  AuthSession,
  AuthUser,
  LoginPayload,
  LoginResponse,
  Menu,
  MeResponse,
  RefreshResponse
} from '../models/auth.model';

/** Les gestionnaires utilisent l'application mobile : l'espace web est réservé à l'administrateur. */
const MOBILE_ONLY_MESSAGE = "L'espace gestionnaire est disponible sur l'application mobile.";

const MENUS_KEY = 'auth_menus';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSig = signal<AuthUser | null>(null);
  private readonly menusSig = signal<Menu[]>(this.readStoredMenus());

  readonly currentUser = this.currentUserSig.asReadonly();
  readonly menus = this.menusSig.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenStorage.hasAccessToken());

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      map((res) => {
        const session = res.payload;
        if (session.step !== 'authenticated' || session.user.role !== 'ADMIN') {
          throw { error: { message: MOBILE_ONLY_MESSAGE } };
        }
        return session;
      }),
      tap((session) => {
        this.tokenStorage.setTokens(session.access_token, session.refresh_token);
        this.setMenus(session.menus);
        this.currentUserSig.set(session.user);
      }),
      catchError((err) => throwError(() => err))
    );
  }

  refresh(): Observable<RefreshResponse> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${refreshToken}` });

    return this.http.post<RefreshResponse>(`${this.apiUrl}/refresh`, {}, { headers }).pipe(
      tap((res) => {
        this.tokenStorage.setTokens(res.payload.access_token, res.payload.refresh_token);
        this.setMenus(res.payload.menus);
        this.currentUserSig.set(res.payload.user);
      })
    );
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`).pipe(
      tap((res) => this.currentUserSig.set(res.payload))
    );
  }

  /**
   * Résout l'utilisateur courant, en le chargeant via /me si l'app vient de démarrer
   * (ex: reload direct sur une route protégée, avant que AppComponent n'ait fini son bootstrap).
   */
  ensureCurrentUser(): Observable<AuthUser | null> {
    const current = this.currentUserSig();
    if (current) {
      return of(current);
    }

    if (!this.tokenStorage.hasAccessToken()) {
      return of(null);
    }

    return this.me().pipe(
      map((res) => res.payload),
      catchError(() => of(null))
    );
  }

  /** Le numéro de connexion n'est pas modifiable ici (réservé à l'administrateur). */
  updateProfile(payload: {
    phone_two?: string | null;
    address?: string | null;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
  }): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.apiUrl}/me`, payload).pipe(
      tap((res) => {
        const user = res.payload as AuthUser | undefined;
        if (user) {
          this.currentUserSig.set(user);
        }
      })
    );
  }

  changePassword(password: string, passwordConfirmation: string): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.apiUrl}/change-password`, {
      password,
      password_confirmation: passwordConfirmation
    });
  }

  forgotPassword(email: string): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(
    email: string,
    code: string,
    password: string,
    passwordConfirmation: string
  ): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${environment.apiUrl}/auth/reset-password`, {
      email,
      code,
      password,
      password_confirmation: passwordConfirmation
    });
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession()
    });
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.currentUserSig.set(null);
    this.menusSig.set([]);
    localStorage.removeItem(MENUS_KEY);
    this.router.navigateByUrl('/auth/login');
  }

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.tokenStorage.getRefreshToken();
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.tokenStorage.setTokens(accessToken, refreshToken);
  }

  private setMenus(menus: Menu[]): void {
    this.menusSig.set(menus);
    localStorage.setItem(MENUS_KEY, JSON.stringify(menus));
  }

  private readStoredMenus(): Menu[] {
    try {
      const raw = localStorage.getItem(MENUS_KEY);
      return raw ? (JSON.parse(raw) as Menu[]) : [];
    } catch {
      return [];
    }
  }
}
