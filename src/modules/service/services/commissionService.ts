import { ServiceAppointment, ServiceProvider, ServiceDefinition } from '../types';

class CommissionService {
  /**
   * Calculates the commission earned by a given provider over a set of completed appointments.
   * Assumes appointment `totalPrice` reflects the price charged.
   */
  public calculateProviderCommissions(
    provider: ServiceProvider,
    appointments: ServiceAppointment[],
    services: ServiceDefinition[]
  ): number {
    let totalCommission = 0;

    for (const app of appointments) {
      // Only compute completed services
      if (app.status !== 'completed') continue;
      
      // Basic flat rate calculation
      const earningsForService = (app.totalPrice * provider.commissionRate) / 100;
      totalCommission += earningsForService;

      // In the future: complex commission per service category, bonuses, etc.
    }

    return totalCommission;
  }

  /**
   * Return array of commission reports per provider
   */
  public generateEnterpriseReport(
    providers: ServiceProvider[],
    appointments: ServiceAppointment[],
    services: ServiceDefinition[]
  ) {
    return providers.map(p => {
      const pAppts = appointments.filter(a => a.providerId === p.id);
      const commission = this.calculateProviderCommissions(p, pAppts, services);
      const totalSales = pAppts.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.totalPrice, 0);

      return {
        providerId: p.id,
        providerName: p.name,
        appointmentsHandled: pAppts.length,
        totalSales,
        commissionEarned: commission
      };
    });
  }
}

export const commissionService = new CommissionService();
