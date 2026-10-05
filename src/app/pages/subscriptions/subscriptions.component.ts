import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../core/services/subscription.service';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionState, SubscriptionStatus } from '../../core/models/auth.model';
import { Subscription, SubscriptionOverviewItem, SubscriptionPayload } from '../../core/models/subscription.model';

const PER_PAGE = 15;

export const STATE_LABELS: Record<SubscriptionState, string> = {
  active: 'Actif',
  expiring: 'Expire bientôt',
  expired: 'Expiré',
  none: 'Aucun'
};

interface SubscriptionFormState {
  plan: string;
  amount: number | null;
  starts_at: string;
  ends_at: string;
  notes: string;
}

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/**
 * Abonnements des entreprises. Le paiement se fait hors de l'application (Wave, Orange Money…) :
 * l'administrateur enregistre ici la période payée.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['../users/users.component.scss', './subscriptions.component.scss']
})
export class SubscriptionsComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly notification = inject(NotificationService);

  protected readonly stateLabels = STATE_LABELS;
  protected readonly states: SubscriptionState[] = ['active', 'expiring', 'expired', 'none'];

  protected readonly items = signal<SubscriptionOverviewItem[]>([]);
  protected readonly counts = signal<Record<SubscriptionState, number>>({ active: 0, expiring: 0, expired: 0, none: 0 });
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly total = signal(0);
  protected search = '';
  protected readonly stateFilter = signal<SubscriptionState | ''>('');

  // Historique d'une entreprise
  protected readonly selected = signal<SubscriptionOverviewItem | null>(null);
  protected readonly history = signal<Subscription[]>([]);
  protected readonly selectedStatus = signal<SubscriptionStatus | null>(null);
  protected readonly isHistoryLoading = signal(false);

  // Formulaire d'ajout / modification
  protected readonly isFormOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected form: SubscriptionFormState = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.subscriptionService.overview(page, PER_PAGE, this.search, this.stateFilter()).subscribe({
      next: (res) => {
        this.items.set(res.payload);
        this.counts.set(res.counts);
        this.currentPage.set(res.meta.current_page);
        this.lastPage.set(res.meta.last_page);
        this.total.set(res.meta.total);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Impossible de charger les abonnements.');
      }
    });
  }

  filterBy(state: SubscriptionState): void {
    this.stateFilter.set(this.stateFilter() === state ? '' : state);
    this.load(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.lastPage()) {
      this.load(page);
    }
  }

  daysLabel(item: SubscriptionStatus): string {
    if (item.days_left === null) {
      return '—';
    }
    if (item.days_left < 0) {
      return `Expiré depuis ${-item.days_left} j`;
    }
    return item.days_left === 0 ? "Expire aujourd'hui" : `${item.days_left} j`;
  }

  openHistory(item: SubscriptionOverviewItem): void {
    this.selected.set(item);
    this.isFormOpen.set(false);
    this.loadHistory(item.tenant_id);
  }

  closeHistory(): void {
    this.selected.set(null);
    this.history.set([]);
    this.isFormOpen.set(false);
  }

  openCreateForm(): void {
    // Proposition : un mois à partir de la fin de la période en cours (ou d'aujourd'hui)
    const status = this.selectedStatus();
    const today = isoDate(new Date());
    const start = status?.ends_at && status.ends_at >= today && status.state !== 'expired'
      ? addDays(status.ends_at, 1)
      : today;

    this.form = { ...this.emptyForm(), starts_at: start, ends_at: addDays(start, 29) };
    this.editingId.set(null);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(subscription: Subscription): void {
    this.form = {
      plan: subscription.plan,
      amount: subscription.amount,
      starts_at: subscription.starts_at.slice(0, 10),
      ends_at: subscription.ends_at.slice(0, 10),
      notes: subscription.notes ?? ''
    };
    this.editingId.set(subscription.id);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.formError.set(null);
  }

  submitForm(): void {
    const tenant = this.selected();
    if (!tenant || this.isSubmitting()) {
      return;
    }
    if (!this.form.plan || this.form.amount === null || !this.form.starts_at || !this.form.ends_at) {
      this.formError.set('Renseignez la formule, le montant et la période.');
      return;
    }

    const payload: SubscriptionPayload = {
      tenant_id: tenant.tenant_id,
      plan: this.form.plan,
      amount: Number(this.form.amount),
      starts_at: this.form.starts_at,
      ends_at: this.form.ends_at,
      notes: this.form.notes || null
    };

    const editingId = this.editingId();
    const request = editingId
      ? this.subscriptionService.update(editingId, payload)
      : this.subscriptionService.create(payload);

    this.isSubmitting.set(true);
    this.formError.set(null);

    request.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.notification.toast(res.message, 'success');
        this.loadHistory(tenant.tenant_id);
        this.load(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.formError.set(err.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }

  async askDelete(subscription: Subscription): Promise<void> {
    const tenant = this.selected();
    const confirmed = await this.notification.confirm({
      title: 'Supprimer cet abonnement ?',
      text: `La période « ${subscription.plan} » du ${this.formatDate(subscription.starts_at)} au ${this.formatDate(subscription.ends_at)} sera supprimée.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      danger: true
    });

    if (!confirmed || !tenant) {
      return;
    }

    this.subscriptionService.delete(subscription.id).subscribe({
      next: (res) => {
        this.notification.toast(res.message, 'success');
        this.loadHistory(tenant.tenant_id);
        this.load(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        this.notification.toast(err.error?.message ?? 'Une erreur est survenue.', 'error');
      }
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  formatAmount(amount: number, currency = 'XOF'): string {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency === 'XOF' ? 'FCFA' : currency}`;
  }

  private loadHistory(tenantId: number): void {
    this.isHistoryLoading.set(true);
    this.subscriptionService.forTenant(tenantId).subscribe({
      next: (res) => {
        this.history.set(res.payload.subscriptions);
        this.selectedStatus.set(res.payload.status);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.history.set([]);
        this.isHistoryLoading.set(false);
      }
    });
  }

  private emptyForm(): SubscriptionFormState {
    return { plan: 'Mensuel', amount: null, starts_at: '', ends_at: '', notes: '' };
  }
}
