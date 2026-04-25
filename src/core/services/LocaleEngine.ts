export type CountryCode = 'BR' | 'PT' | 'US' | 'GB';

export interface RegionalSettings {
  currencySymbol: string;
  currency: string;
  locale: string;
  taxLabel: string;
  identityLabel: string;
  dateFormat: string;
  measurementSystem: 'metric' | 'imperial';
}

const REGIONAL_CONFIGS: Record<CountryCode, RegionalSettings> = {
  BR: { currency: 'BRL', locale: 'pt-BR', taxLabel: 'Impostos', identityLabel: 'CPF/CNPJ', dateFormat: 'dd/MM/yyyy', measurementSystem: 'metric' },
  PT: { currency: 'EUR', locale: 'pt-PT', taxLabel: 'IVA', identityLabel: 'NIF', dateFormat: 'dd/MM/yyyy', measurementSystem: 'metric' },
  US: { currency: 'USD', locale: 'en-US', taxLabel: 'Sales Tax', identityLabel: 'SSN/EIN', dateFormat: 'MM/dd/yyyy', measurementSystem: 'imperial' },
  GB: { currency: 'GBP', locale: 'en-GB', taxLabel: 'VAT', identityLabel: 'National Insurance', dateFormat: 'dd/MM/yyyy', measurementSystem: 'metric' },
};

class LocaleEngine {
  private currentCountry: CountryCode = 'BR';

  setCountry(code: CountryCode) {
    this.currentCountry = code;
  }

  get settings(): RegionalSettings {
    return REGIONAL_CONFIGS[this.currentCountry] || REGIONAL_CONFIGS.BR;
  }

  formatMoney(value: number, abbreviate: boolean = false): string {
    const formatter = new Intl.NumberFormat(this.settings.locale, {
      style: 'currency',
      currency: this.settings.currency,
    });

    if (!abbreviate || Math.abs(value) < 1000) {
      return formatter.format(value);
    }

    let shortValue = value;
    let suffix = '';

    if (Math.abs(value) >= 1000000) {
      shortValue = value / 1000000;
      suffix = 'M';
    } else {
      shortValue = value / 1000;
      suffix = 'k';
    }

    const numPart = new Intl.NumberFormat(this.settings.locale, {
      maximumFractionDigits: 1,
    }).format(shortValue) + suffix;

    // Detecta a posição do símbolo da moeda para o locale atual
    const parts = formatter.formatToParts(1);
    const symbol = parts.find(p => p.type === 'currency')?.value || '';
    const isPrefix = parts.findIndex(p => p.type === 'currency') < parts.findIndex(p => p.type === 'integer');

    return isPrefix ? `${symbol} ${numPart}` : `${numPart} ${symbol}`;
  }

  formatDate(date: number | Date): string {
    return new Intl.DateTimeFormat(this.settings.locale).format(date);
  }

  translateIdentity(label: string): string {
    if (label.toLowerCase().includes('cpf')) return this.settings.identityLabel;
    if (label.toLowerCase().includes('imposto')) return this.settings.taxLabel;
    return label;
  }
}

export const localeEngine = new LocaleEngine();