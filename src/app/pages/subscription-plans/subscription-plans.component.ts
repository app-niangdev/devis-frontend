import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlanService } from '../../core/services/subscription-plan.service';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionPlan, SubscriptionPlanPayload } from '../../core/models/subscription.model';

interface PlanFormState {
  name: string;
  duration_months: number | null;
  price: number | null;
  description: string;
  position: number | null;
}

/**
 * Types d'abonnement (forfaits). Le prix et la durée sont figés à la création :
 * pour un nouveau tarif, on désactive le forfait et on en crée un autre.
 */
@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['../users/users.component.scss', './subscription-plans.component.scss']
})
export class SubscriptionPlansComponent implements OnInit {
  private readonly planService = inject(SubscriptionPlanService);
  private readonly notification = inject(NotificationService);

  protected readonly plans = signal<SubscriptionPlan[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isFormOpen = signal(false);
  protected readonly editing = signal<SubscriptionPlan | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected form: PlanFormState = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.planService.list().subscribe({
      next: (res) => {
        this.plans.set(res.payload);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Impossible de charger les forfaits.');
      }
    });
  }

  openCreateForm(): void {
    this.form = this.emptyForm();
    this.editing.set(null);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(plan: SubscriptionPlan): void {
    this.form = {
      name: plan.name,
      duration_months: plan.duration_months,
      price: plan.price,
      description: plan.description ?? '',
      position: plan.position
    };
    this.editing.set(plan);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.formError.set(null);
  }

  submitForm(): void {
    if (this.isSubmitting()) {
      return;
    }

    const editing = this.editing();
    if (!this.form.name.trim() || (!editing && (!this.form.duration_months || this.form.price === null))) {
      this.formError.set('Renseignez le nom, la durée et le prix.');
      return;
    }

    const payload: SubscriptionPlanPayload = {
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      position: this.form.position
    };
    // Prix et durée envoyés seulement à la création (refusés en modification par l'API)
    if (!editing) {
      payload.duration_months = Number(this.form.duration_months);
      payload.price = Number(this.form.price);
    }

    const request = editing ? this.planService.update(editing.id, payload) : this.planService.create(payload);

    this.isSubmitting.set(true);
    this.formError.set(null);

    request.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.notification.toast(res.message, 'success');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.formError.set(err.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }

  async toggleActive(plan: SubscriptionPlan): Promise<void> {
    if (plan.is_active) {
      const confirmed = await this.notification.confirm({
        title: 'Désactiver ce forfait ?',
        text: `« ${plan.name} » ne sera plus proposé. Les abonnements déjà enregistrés ne changent pas.`,
        confirmText: 'Désactiver',
        cancelText: 'Annuler'
      });
      if (!confirmed) {
        return;
      }
    }

    this.planService.toggleStatus(plan.id).subscribe({
      next: (res) => {
        this.notification.toast(res.message, 'success');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.toast(err.error?.message ?? 'Une erreur est survenue.', 'error');
      }
    });
  }

  async askDelete(plan: SubscriptionPlan): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: 'Supprimer ce forfait ?',
      text: `Le forfait « ${plan.name} » sera supprimé.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.planService.delete(plan.id).subscribe({
      next: (res) => {
        this.notification.toast(res.message, 'success');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.toast(err.error?.message ?? 'Une erreur est survenue.', 'error');
      }
    });
  }

  durationLabel(months: number): string {
    return months % 12 === 0 ? `${months / 12} an${months > 12 ? 's' : ''}` : `${months} mois`;
  }

  monthlyLabel(plan: SubscriptionPlan): string {
    return `≈ ${this.formatAmount(Math.round(plan.price / plan.duration_months), plan.currency)} / mois`;
  }

  formatAmount(amount: number, currency = 'XOF'): string {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency === 'XOF' ? 'FCFA' : currency}`;
  }

  private emptyForm(): PlanFormState {
    return { name: '', duration_months: null, price: null, description: '', position: null };
  }
}
