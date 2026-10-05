import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../layout.service';
import { NavItem } from '../../models/nav-item.model';
import { AuthService } from '../../auth/auth.service';

const FALLBACK_ICON = 'bi-dot';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  private readonly authService = inject(AuthService);

  protected readonly navItems = computed<NavItem[]>(() =>
    [...this.authService.menus()]
      .sort((a, b) => a.position - b.position)
      .map((menu) => ({
        label: menu.title,
        icon: menu.icon || FALLBACK_ICON,
        route: menu.url
      }))
  );

  onNavigate(): void {
    this.layout.closeMobileSidebar();
  }
}
