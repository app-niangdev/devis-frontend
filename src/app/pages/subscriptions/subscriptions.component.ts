import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SubscriptionPlanService } from '../../core/services/subscription-plan.service';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionState, SubscriptionStatus } from '../../core/models/auth.model';
import {
  Subscription,
  SubscriptionOverviewItem,
  SubscriptionPayload,
  SubscriptionPlan
} from '../../core/models/subscription.model';

const PER_PAGE = 15;

export const STATE_LABELS: Record<SubscriptionState, string> = {
  active: 'Actif',
  expiring: 'Expire bientôt',
  expired: 'Expiré',
  none: 'Aucun'
};

interface SubscriptionFormState {
  subscription_plan_id: number | null;
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

/** Dernier jour couvert : début + N mois − 1 jour (même calcul que l'API, sans débordement de mois). */
function planEnd(startIso: string, months: number): string {
  const [y, m, d] = startIso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  target.setDate(target.getDate() - 1);
  return isoDate(target);
}

/**
 * Abonnements des entreprises. Le paiement se fait hors de l'application (Wave, Orange Money…) :
 * l'administrateur enregistre ici le forfait payé et sa date de début ; la fin et le montant en découlent.
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
  private readonly planService = inject(SubscriptionPlanService);
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
  /** Abonnement modifié sans forfait (essai, ancienne saisie) : dates saisies à la main. */
  protected readonly editingWithoutPlan = signal(false);

  /** Tous les forfaits (les désactivés restent utiles pour afficher et modifier l'historique). */
  protected readonly plans = signal<SubscriptionPlan[]>([]);

  ngOnInit(): void {
    this.load();
    this.planService.list().subscribe({ next: (res) => this.plans.set(res.payload) });
  }

  /** Forfaits proposés dans le formulaire : actifs, plus celui de l'abonnement modifié. */
  selectablePlans(): SubscriptionPlan[] {
    const current = this.editingPlanId;
    return this.plans().filter((plan) => plan.is_active || plan.id === current);
  }

  selectedPlan(): SubscriptionPlan | null {
    return this.plans().find((plan) => plan.id === Number(this.form.subscription_plan_id)) ?? null;
  }

  /** Fin calculée pour l'aperçu du formulaire. */
  computedEnd(): string | null {
    const plan = this.selectedPlan();
    return plan && this.form.starts_at ? planEnd(this.form.starts_at, plan.duration_months) : null;
  }

  durationLabel(months: number): string {
    return months % 12 === 0 ? `${months / 12} an${months > 12 ? 's' : ''}` : `${months} mois`;
  }

  private editingPlanId: number | null = null;

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
    // Début proposé : lendemain de la période en cours (ou aujourd'hui)
    const status = this.selectedStatus();
    const today = isoDate(new Date());
    const start = status?.ends_at && status.ends_at >= today && status.state !== 'expired'
      ? addDays(status.ends_at, 1)
      : today;

    const firstPlan = this.plans().find((plan) => plan.is_active);
    this.form = { ...this.emptyForm(), subscription_plan_id: firstPlan?.id ?? null, starts_at: start };
    this.editingPlanId = null;
    this.editingWithoutPlan.set(false);
    this.editingId.set(null);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(subscription: Subscription): void {
    this.form = {
      subscription_plan_id: subscription.subscription_plan_id,
      starts_at: subscription.starts_at.slice(0, 10),
      ends_at: subscription.ends_at.slice(0, 10),
      notes: subscription.notes ?? ''
    };
    this.editingPlanId = subscription.subscription_plan_id;
    this.editingWithoutPlan.set(subscription.subscription_plan_id === null);
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
    const planId = this.form.subscription_plan_id ? Number(this.form.subscription_plan_id) : null;
    if (!this.form.starts_at || (!planId && (!this.editingWithoutPlan() || !this.form.ends_at))) {
      this.formError.set(this.editingWithoutPlan() ? 'Renseignez la période.' : 'Choisissez un forfait et la date de début.');
      return;
    }

    const payload: SubscriptionPayload = {
      tenant_id: tenant.tenant_id,
      subscription_plan_id: planId,
      starts_at: this.form.starts_at,
      notes: this.form.notes || null
    };
    if (!planId) {
      payload.ends_at = this.form.ends_at;
    }

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
    return { subscription_plan_id: null, starts_at: '', ends_at: '', notes: '' };
  }
}
