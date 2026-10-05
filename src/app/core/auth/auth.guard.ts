import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.hasAccessToken()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

export const adminGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!tokenStorage.hasAccessToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  return authService
    .ensureCurrentUser()
    .pipe(map((user) => user?.role === 'ADMIN' || router.createUrlTree(['/dashboard'])));
};

export const guestGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (!tokenStorage.hasAccessToken()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
