import { accountService } from './accountService';

const translations: Record<string, Record<string, string>> = {
  pt: {
    'dashboard.title': 'Dashboard',
    'dashboard.audit_passed': 'Dados Auditados',
    'checkout.card': 'CARTÃO',
    'checkout.cash': 'DINHEIRO',
    'checkout.total': 'Total Venda',
    'finance.revenue': 'Receita Bruta',
    'finance.tax': 'Impostos',
    'printer.footer': 'OBRIGADO PELA PREFERENCIA',
    'printer.copy': 'Via do Cliente',
    'staff.title': 'Central do Colaborador',
    'staff.members': 'Membros do Time',
    'staff.roles': 'Cargos & Permissões',
    'inventory.collector_mode': 'Modo Coleta',
    'inventory.scanner_active': 'Scanner Ativo',
  },
  en: {
    'dashboard.title': 'Analytics',
    'dashboard.audit_passed': 'Audited Data',
    'checkout.card': 'CREDIT CARD',
    'checkout.cash': 'CASH',
    'checkout.total': 'Order Total',
    'finance.revenue': 'Gross Revenue',
    'finance.tax': 'Taxes',
    'printer.footer': 'THANK YOU FOR YOUR BUSINESS',
    'printer.copy': 'Customer Copy',
    'staff.title': 'Staff Center',
    'staff.members': 'Team Members',
    'staff.roles': 'Roles & Permissions',
    'inventory.collector_mode': 'Collector Mode',
    'inventory.scanner_active': 'Scanner Active',
  }
};

export class LocaleEngine {
  private static lang: string = 'pt';
  private static currency: string = 'BRL';
  private static customTaxLabel: string | null = null;

  static initialize(config: { lang?: string; currency?: string; taxLabel?: string }) {
    this.lang = config.lang || 'pt';
    this.currency = config.currency || 'BRL';
    this.customTaxLabel = config.taxLabel || null;
  }

  static t(key: string): string {
    return translations[this.lang]?.[key] || key;
  }

  static formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.lang === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(value);
  }

  static get settings() {
    return {
      lang: this.lang,
      currency: this.currency,
      taxLabel: this.customTaxLabel || (this.lang === 'pt' ? 'Impostos' : 'Taxes')
    };
  }
}

export const t = (key: string) => LocaleEngine.t(key);

// Compat layer for legacy services that still import `localeEngine`.
export type CountryCode = 'BR' | 'US' | 'PT' | 'ES' | 'AO' | 'MZ';
export const localeEngine = {
  get settings() {
    return LocaleEngine.settings;
  },
  set settings(value: { lang?: string; currency?: string; taxLabel?: string }) {
    LocaleEngine.initialize(value || {});
  },
  setCountry(country: CountryCode) {
    const map: Record<CountryCode, { lang: string; currency: string }> = {
      BR: { lang: 'pt', currency: 'BRL' },
      US: { lang: 'en', currency: 'USD' },
      PT: { lang: 'pt', currency: 'EUR' },
      ES: { lang: 'en', currency: 'EUR' },
      AO: { lang: 'pt', currency: 'AOA' },
      MZ: { lang: 'pt', currency: 'MZN' },
    };
    const cfg = map[country] || map.BR;
    LocaleEngine.initialize({ ...LocaleEngine.settings, lang: cfg.lang, currency: cfg.currency });
  },
  formatMoney(value: number) {
    return LocaleEngine.formatCurrency(value);
  },
};
