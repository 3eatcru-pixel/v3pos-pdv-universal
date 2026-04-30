import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, StockTransferEngine } from './StockTransferEngine';
import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

/**
 * Hook especializado para gerenciar o fluxo de transferências de estoque.
 * Centraliza a lógica de busca e filtragem para o Dashboard e Telas de Inventário.
 */
export const useStockTransfer = (enterpriseId: string, shopId?: string | null) => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  const fetchTransfers = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Busca todas as transferências da empresa. 
      // Otimização: Usar query filtrada por enterpriseId e shopId (se aplicável)
      const queryConditions = [{ field: 'enterpriseId', op: '==', value: enterpriseId }];
      if (shopId) {
        queryConditions.push({ field: 'destinationShopId', op: '==', value: shopId });
      }
      const data = await firebaseService.getDocsByQuery('stock_transfers', queryConditions) as StockTransfer[];
      
      // Ordena por data de saída (mais recentes no topo)
      const sorted = [...data].sort((a, b) => b.shippedAt - a.shippedAt);
      setTransfers(sorted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar transferências';
      setError(msg);
      logger.error('inventory', 'Falha ao buscar transferências no hook', { enterpriseId, shopId, err });
    } finally {
      setLoading(false);
    }
  }, [enterpriseId, shopId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Filtro de Histórico por Mês/Ano
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (filterMonth === null || filterYear === null) return true;
      const date = new Date(t.shippedAt);
      return date.getMonth() === filterMonth && date.getFullYear() === filterYear;
    });
  }, [transfers, filterMonth, filterYear]);

  // Filtro inteligente: Transferências que ESTÃO CHEGANDO nesta unidade e aguardam conferência
  const pendingReceipt = useMemo(() => {
    return transfers.filter(t => 
      t.status === 'shipped' && 
      (!shopId || t.destinationShopId === shopId)
    );
  }, [transfers, shopId]);

  const receiveTransfer = async (transferId: string, userId: string, userName: string, receivedQuantities: Record<string, number>) => {
    try {
      await StockTransferEngine.finalizeTransfer(transferId, userId, userName, receivedQuantities);
      await fetchTransfers(); // Refresh automático da lista para limpar o dashboard
    } catch (err) {
      logger.error('inventory', 'Erro ao finalizar recebimento via hook', { transferId, err });
      throw err;
    }
  };

  const setPeriod = (month: number, year: number) => {
    setFilterMonth(month);
    setFilterYear(year);
  };

  return {
    transfers: filteredTransfers, // Lista filtrada para histórico
    pendingReceipt,   // Lista filtrada para alertas no Dashboard
    loading,
    error,
    refresh: fetchTransfers,
    receiveTransfer,
    setPeriod
  };
};
