import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { localeEngine } from './core/services/LocaleEngine';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, abbreviate: boolean = false) {
  return localeEngine.formatMoney(value, abbreviate);
}
