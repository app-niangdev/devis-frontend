import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell/shell.component';
import { AuthLayoutComponent } from './pages/auth/auth-layout/auth-layout.component';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [guestGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent
          )
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./pages/auth/otp-verification/otp-verification.component').then(
            (m) => m.OtpVerificationComponent
          )
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
          )
      }
    ]
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { title: 'Tableau de bord' }
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users.component').then((m) => m.UsersComponent),
        canActivate: [adminGuard],
        data: { title: 'Utilisateurs' }
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./pages/tenants/tenants.component').then((m) => m.TenantsComponent),
        canActivate: [adminGuard],
        data: { title: 'Entreprises' }
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./pages/subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
        canActivate: [adminGuard],
        data: { title: 'Abonnements' }
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
        data: { title: 'Mon profil' }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
