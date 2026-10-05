import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { DEFAULT_COLORS, DepositType, Tenant, TenantPayload } from '../../core/models/tenant.model';
import { UserListItem } from '../../core/models/user.model';
import { SubscriptionState } from '../../core/models/auth.model';

const PER_PAGE = 12;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

interface TenantFormState {
  name: string;
  code_website: string;
  slogan: string;
  short_name: string;
  trade: string;
  address: string;
  email: string;
  ninea: string;
  rccm: string;
  phone_call: string;
  phone_whatsapp: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_deposit_type: DepositType;
  default_deposit_value: number;
  quote_validity_days: number;
  quote_footer: string;
  user_id: number | null;
}

function emptyForm(): TenantFormState {
  return {
    name: '',
    code_website: '',
    slogan: '',
    short_name: '',
    trade: '',
    address: '',
    email: '',
    ninea: '',
    rccm: '',
    phone_call: '',
    phone_whatsapp: '',
    ...DEFAULT_COLORS,
    default_deposit_type: 'none',
    default_deposit_value: 0,
    quote_validity_days: 30,
    quote_footer: '',
    user_id: null
  };
}

export const SUBSCRIPTION_LABELS: Record<SubscriptionState, string> = {
  active: 'Abonnement actif',
  expiring: 'Expire bientôt',
  expired: 'Abonnement expiré',
  none: 'Sans abonnement'
};

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss'
})
export class TenantsComponent implements OnInit, OnDestroy {
  private readonly tenantService = inject(TenantService);
  private readonly userService = inject(UserService);
  private readonly notification = inject(NotificationService);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly availableManagers = signal<UserListItem[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly currentPage = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly total = signal(0);
  protected search = '';

  protected readonly isFormOpen = signal(false);
  protected readonly editingTenantId = signal<number | null>(null);
  protected form: TenantFormState = emptyForm();

  protected readonly subscriptionLabels = SUBSCRIPTION_LABELS;

  protected readonly logoFile = signal<File | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(null);
  protected readonly removeLogo = signal(false);
  private objectUrl: string | null = null;

  ngOnInit(): void {
    this.loadTenants();
    this.loadAvailableManagers();
  }

  loadTenants(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.tenantService.list(PER_PAGE, this.search, page).subscribe({
      next: (res) => {
        this.tenants.set(res.payload);
        this.currentPage.set(res.meta.current_page);
        this.lastPage.set(res.meta.last_page);
        this.total.set(res.meta.total);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Impossible de charger les entreprises.');
      }
    });
  }

  loadAvailableManagers(): void {
    this.userService.list(100, '', 'MANAGER').subscribe({
      next: (res) => this.availableManagers.set(res.payload),
      error: () => this.availableManagers.set([])
    });
  }

  onSearch(): void {
    this.loadTenants(1);
  }

  managersForForm(): UserListItem[] {
    const editingId = this.editingTenantId();
    return this.availableManagers().filter(
      (m) => !m.tenant_id || (editingId !== null && m.tenant_id === editingId)
    );
  }

  managerName(tenant: Tenant): string | null {
    return tenant.managers?.[0]?.full_name ?? null;
  }

  daysLabel(tenant: Tenant): string {
    const sub = tenant.subscription;
    if (!sub || sub.days_left === null) {
      return '';
    }
    if (sub.days_left < 0) {
      return `depuis ${-sub.days_left} j`;
    }
    return sub.days_left === 0 ? "expire aujourd'hui" : `${sub.days_left} j restants`;
  }

  isValidColor(value: string): boolean {
    return HEX_COLOR.test(value);
  }

  openCreateForm(): void {
    this.form = emptyForm();
    this.editingTenantId.set(null);
    this.errorMessage.set(null);
    this.resetLogoState(null);
    this.isFormOpen.set(true);
  }

  openEditForm(tenant: Tenant): void {
    this.form = {
      name: tenant.name,
      code_website: tenant.code_website,
      slogan: tenant.slogan ?? '',
      short_name: tenant.short_name ?? '',
      trade: tenant.trade ?? '',
      address: tenant.address ?? '',
      email: tenant.email ?? '',
      ninea: tenant.ninea ?? '',
      rccm: tenant.rccm ?? '',
      phone_call: tenant.phone_call ?? '',
      phone_whatsapp: tenant.phone_whatsapp ?? '',
      primary_color: tenant.primary_color ?? DEFAULT_COLORS.primary_color,
      secondary_color: tenant.secondary_color ?? DEFAULT_COLORS.secondary_color,
      accent_color: tenant.accent_color ?? DEFAULT_COLORS.accent_color,
      default_deposit_type: tenant.default_deposit_type ?? 'none',
      default_deposit_value: tenant.default_deposit_value ?? 0,
      quote_validity_days: tenant.quote_validity_days ?? 30,
      quote_footer: tenant.quote_footer ?? '',
      user_id: tenant.managers?.[0]?.id ?? null
    };
    this.editingTenantId.set(tenant.id);
    this.errorMessage.set(null);
    this.resetLogoState(tenant.logo_url);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.errorMessage.set(null);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.logoFile.set(file);
    this.removeLogo.set(false);
    this.revokeObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.logoPreviewUrl.set(this.objectUrl);
  }

  onRemoveLogo(): void {
    this.logoFile.set(null);
    this.removeLogo.set(true);
    this.revokeObjectUrl();
    this.logoPreviewUrl.set(null);
  }

  submitForm(): void {
    if (!this.form.name || !this.form.code_website || this.isSubmitting()) {
      return;
    }

    const colors = [this.form.primary_color, this.form.secondary_color, this.form.accent_color];
    if (!colors.every((c) => this.isValidColor(c))) {
      this.errorMessage.set('Les couleurs doivent être au format #RRGGBB.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: TenantPayload = {
      name: this.form.name,
      code_website: this.form.code_website,
      slogan: this.form.slogan || null,
      short_name: this.form.short_name || null,
      trade: this.form.trade || null,
      address: this.form.address || null,
      email: this.form.email || null,
      ninea: this.form.ninea || null,
      rccm: this.form.rccm || null,
      phone_call: this.form.phone_call || null,
      phone_whatsapp: this.form.phone_whatsapp || null,
      primary_color: this.form.primary_color.toUpperCase(),
      secondary_color: this.form.secondary_color.toUpperCase(),
      accent_color: this.form.accent_color.toUpperCase(),
      default_deposit_type: this.form.default_deposit_type,
      default_deposit_value: this.form.default_deposit_type === 'none' ? 0 : Number(this.form.default_deposit_value) || 0,
      quote_validity_days: Number(this.form.quote_validity_days) || 30,
      quote_footer: this.form.quote_footer || null,
      user_id: this.form.user_id,
      logo: this.logoFile(),
      remove_logo: this.removeLogo()
    };

    const editingId = this.editingTenantId();
    const request = editingId
      ? this.tenantService.update(editingId, payload)
      : this.tenantService.create(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.notification.toast(editingId ? 'Entreprise modifiée avec succès.' : 'Entreprise créée avec succès.', 'success');
        this.loadTenants(this.currentPage());
        this.loadAvailableManagers();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.extractErrorMessage(err));
      }
    });
  }

  async toggleActive(tenant: Tenant): Promise<void> {
    const isDisabling = tenant.state;

    const confirmed = await this.notification.confirm({
      title: isDisabling ? 'Désactiver cette entreprise ?' : 'Réactiver cette entreprise ?',
      text: isDisabling
        ? `« ${tenant.name} » sera désactivée : son gestionnaire ne pourra plus se connecter tant qu'elle n'aura pas été réactivée.`
        : `« ${tenant.name} » sera réactivée et redeviendra accessible.`,
      confirmText: isDisabling ? 'Désactiver' : 'Réactiver',
      cancelText: 'Annuler',
      danger: isDisabling
    });

    if (!confirmed) {
      return;
    }

    this.tenantService.toggleStatus(tenant.id).subscribe({
      next: (res) => {
        this.notification.toast(
          res.payload.state ? 'Entreprise activée avec succès.' : 'Entreprise désactivée avec succès.',
          'success'
        );
        this.loadTenants(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        this.notification.toast(err.error?.message ?? 'Une erreur est survenue.', 'error');
      }
    });
  }

  async askDelete(tenant: Tenant): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: 'Supprimer cette entreprise ?',
      text: `« ${tenant.name} » sera supprimée définitivement, avec ses clients et ses devis. Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.tenantService.forceDelete(tenant.id).subscribe({
      next: () => {
        this.notification.toast('Entreprise supprimée définitivement.', 'success');
        this.loadTenants(this.currentPage());
        this.loadAvailableManagers();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.toast(err.error?.message ?? 'Une erreur est survenue.', 'error');
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage()) {
      return;
    }
    this.loadTenants(page);
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    const errors = err.error?.errors;
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0];
      if (firstKey && Array.isArray(errors[firstKey])) {
        return errors[firstKey][0];
      }
    }
    return err.error?.message ?? 'Une erreur est survenue.';
  }

  private resetLogoState(existingLogoUrl: string | null): void {
    this.logoFile.set(null);
    this.removeLogo.set(false);
    this.revokeObjectUrl();
    this.logoPreviewUrl.set(existingLogoUrl);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }
}
