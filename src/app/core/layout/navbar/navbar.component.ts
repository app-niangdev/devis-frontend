import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LayoutService } from '../layout.service';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ROLE_LABELS } from '../../models/auth.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isProfileMenuOpen = signal(false);
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.resolveTitle())
    ),
    { initialValue: this.resolveTitle() }
  );

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((v) => !v);
  }

  async logout(): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: 'Déconnexion',
      text: 'Voulez-vous vraiment vous déconnecter ?',
      confirmText: 'Se déconnecter',
      cancelText: 'Rester connecté',
      icon: 'question'
    });

    if (!confirmed) {
      return;
    }

    this.authService.logout();
    this.notification.toast('Vous avez été déconnecté.', 'info');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.navbar__profile')) {
      this.isProfileMenuOpen.set(false);
    }
  }

  private resolveTitle(): string {
    let current: ActivatedRoute | null = this.route.firstChild;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    const data = current?.snapshot?.data;
    return (data && data['title']) || 'Tableau de bord';
  }
}
