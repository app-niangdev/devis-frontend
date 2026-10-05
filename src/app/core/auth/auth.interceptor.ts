import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/otp/',
  '/auth/password/set'
];

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  const isPublic = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const accessToken = tokenStorage.getAccessToken();

  const authReq = !isPublic && accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isPublic) {
        return throwError(() => error);
      }

      if (!tokenStorage.getRefreshToken()) {
        authService.clearSession();
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshedToken$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
          )
        );
      }

      isRefreshing = true;
      refreshedToken$.next(null);

      return authService.refresh().pipe(
        switchMap((res) => {
          isRefreshing = false;
          refreshedToken$.next(res.payload.access_token);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.payload.access_token}` } }));
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          authService.clearSession();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
