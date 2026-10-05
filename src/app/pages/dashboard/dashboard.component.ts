import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboard, AdminDashboardService } from '../../core/services/admin-dashboard.service';
import { SubscriptionStatus } from '../../core/models/auth.model';
import { STATE_LABELS } from '../subscriptions/subscriptions.component';

interface KpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dashboardService = inject(AdminDashboardService);

  protected readonly stateLabels = STATE_LABELS;
  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly kpis = signal<KpiCard[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.dashboardService.get().subscribe({
      next: (res) => {
        const d = res.payload;
        this.data.set(d);
        this.kpis.set([
          {
            label: 'Entreprises',
            value: String(d.tenants.total),
            hint: `${d.tenants.active} active(s) · ${d.managers} gestionnaire(s)`,
            tone: 'neutral'
          },
          {
            label: 'Abonnements actifs',
            value: String(d.subscriptions.active + d.subscriptions.expiring),
            hint: `${d.subscriptions.expiring} expire(nt) bientôt`,
            tone: d.subscriptions.expiring > 0 ? 'down' : 'up'
          },
          {
            label: 'Expirés ou sans abonnement',
            value: String(d.subscriptions.expired + d.subscriptions.none),
            hint: 'Gestionnaires bloqués',
            tone: d.subscriptions.expired + d.subscriptions.none > 0 ? 'down' : 'neutral'
          },
          {
            label: 'Encaissé ce mois',
            value: `${new Intl.NumberFormat('fr-FR').format(d.revenue_month)} FCFA`,
            hint: `${d.quotes_month} devis créés ce mois`,
            tone: 'up'
          }
        ]);
      },
      error: () => this.errorMessage.set('Impossible de charger le tableau de bord.')
    });
  }

  daysLabel(item: SubscriptionStatus): string {
    if (item.days_left === null) {
      return 'Aucun abonnement';
    }
    if (item.days_left < 0) {
      return `Expiré depuis ${-item.days_left} j`;
    }
    return item.days_left === 0 ? "Expire aujourd'hui" : `Expire dans ${item.days_left} j`;
  }
}
