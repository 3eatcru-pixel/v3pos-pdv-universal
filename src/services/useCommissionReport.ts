import { useState, useEffect, useMemo } from 'react';
import { commissionService } from '../services/commissionService';
import { useCollection } from '../../../hooks/useCollection';
import { ServiceProvider, ServiceDefinition, Order } from '../../../types';
import { logger } from '../../../core/services/logger';
import { firebaseService } from '../../../services/firebaseService'; // Import firebaseService

interface CommissionReportEntry {
  providerId: string;
  providerName: string;
  ordersHandled: number;
  totalSales: number;
  commissionEarned: number;
}

export const useCommissionReport = (enterpriseId: string | undefined, shopId: string | null, startDate?: number, endDate?: number) => {
  const [report, setReport] = useState<CommissionReportEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState<Error | null>(null);
  const [overallLoading, setOverallLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca todos os provedores (staff)
  const { data: providers, isLoading: isLoadingProviders, error: errorProviders } = useCollection<ServiceProvider>('staff', {
    enterpriseId: enterpriseId || null,
    shopId: shopId || null,
  });

  // Busca todas as definições de serviço
  const { data: services, isLoading: isLoadingServices, error: errorServices } = useCollection<ServiceDefinition>('services', {
    enterpriseId: enterpriseId || null,
    shopId: shopId || null,
  });

  // Subscrição direta para orders para permitir filtragem por data
  useEffect(() => {
    if (!enterpriseId) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    setIsLoadingOrders(true);
    setErrorOrders(null);

    const whereClauses: Array<{ field: string; op: any; value: any }> = [];
    if (startDate) {
      whereClauses.push({ field: 'createdAt', op: '>=', value: startDate });
    }
    if (endDate) {
      whereClauses.push({ field: 'createdAt', op: '<=', value: endDate });
    }

    const unsubscribe = firebaseService.subscribeCollection<Order>(
      'orders',
      enterpriseId,
      shopId,
      (data) => {
        setOrders(data);
        setIsLoadingOrders(false);
      },
      {
        where: whereClauses,
        orderBy: { field: 'createdAt', direction: 'desc' }
      }
    );

    return () => unsubscribe();
  }, [enterpriseId, shopId, startDate, endDate]);

  useEffect(() => {
    setOverallLoading(isLoadingProviders || isLoadingServices || isLoadingOrders);
    if (errorProviders || errorServices || errorOrders) {
      setError(errorProviders?.message || errorServices?.message || errorOrders?.message || 'Erro ao carregar dados para o relatório de comissões.');
    } else {
      setError(null);
    }
  }, [isLoadingProviders, isLoadingServices, isLoadingOrders, errorProviders, errorServices, errorOrders]); // Dependências para o estado geral de loading/erro

  useMemo(() => {
    // Gera o relatório apenas se todos os dados estiverem carregados e não houver erros
    if (!overallLoading && !error && enterpriseId) {
      try {
        // Garante que providers e services não sejam arrays vazios se ainda estiverem carregando
        if (providers.length === 0 && !isLoadingProviders) {
          logger.warn('hooks', 'Nenhum provedor encontrado para o relatório de comissões.');
        }
        if (services.length === 0 && !isLoadingServices) {
          logger.warn('hooks', 'Nenhum serviço encontrado para o relatório de comissões.');
        }
        const generatedReport = commissionService.generateEnterpriseReport(providers || [], orders || [], services || []);
        setReport(generatedReport);
      } catch (err) {
        logger.error('hooks', 'Erro ao gerar relatório de comissões', { error: err });
        setError('Falha ao gerar relatório de comissões.');
      }
    }
  }, [overallLoading, error, enterpriseId, providers, orders, services]); // Dependências para a geração do relatório

  return { report, isLoading: overallLoading, error };
};