import type { OrderItem } from '../../../types';

const BAR_CATEGORIES = new Set(['bebidas', 'bar', 'foh', 'drinks', 'cocktails']);

export interface StationSplit {
  kitchenItems: OrderItem[];
  barItems: OrderItem[];
  hasAllergyAlert: boolean;
}

export class RestaurantRoutingEngine {
  static splitItemsByStation(items: OrderItem[]): StationSplit {
    const kitchenItems: OrderItem[] = [];
    const barItems: OrderItem[] = [];
    let hasAllergyAlert = false;

    for (const item of items) {
      const category = (item.category || '').trim().toLowerCase();
      const isBar = BAR_CATEGORIES.has(category);
      if (isBar) barItems.push(item);
      else kitchenItems.push(item);

      if (item.modifiers?.some((m) => m.type === 'allergy')) {
        hasAllergyAlert = true;
      }
      if ((item.notes || '').toLowerCase().includes('alerg')) {
        hasAllergyAlert = true;
      }
    }

    return {
      kitchenItems,
      barItems,
      hasAllergyAlert,
    };
  }
}
